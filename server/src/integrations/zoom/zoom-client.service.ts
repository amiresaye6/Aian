import { Injectable, Logger } from '@nestjs/common';
import { ProviderClient, ProviderConnection, ProviderResource } from '../contracts';
import { EncryptionService } from '../../common/encryption.service';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';


export enum MeetingType {
  Scheduled = 'scheduled',
  Live = 'live',
  Upcoming = 'upcoming',
}

export interface MeetingData {
  id: string;
  topic: string;
  joinUrl: string;
  startUrl: string;
  startTime: string;
  duration: number;
}

@Injectable()
export class ZoomClientService implements ProviderClient {
  private readonly logger = new Logger(ZoomClientService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prismaService: PrismaService,
    private readonly emailService:EmailService
  ) {}

  /**
   * Verifies if the active connection is healthy and authorized.
   * Decrypts the access token and calls Zoom's /users/me API endpoint.
   */
  async verifyConnection(connection: ProviderConnection): Promise<{ isValid: boolean; message: string }> {
    try {
      const accessToken = this.encryptionService.decrypt(connection.accessTokenEncrypted);

      const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      //console.log(response)
      this.logger.log(`Zoom connection verified for user: ${response.data.email}`);
      return {
        isValid: true,
        message: `Connected as ${response.data.first_name} ${response.data.last_name} (${response.data.email})`,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.warn(`Access token expired for connection ${connection.id}. Trying to refresh...`);
        try {
          const newAccessToken = await this.refreshAccessToken(connection);
          
          const retryResponse = await axios.get('https://api.zoom.us/v2/users/me', {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });
          return retryResponse.data;
        } catch (refreshError: any) {
          throw new Error(`Token refresh failed or retry failed: ${refreshError.message}`);
        }
      }
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Zoom connection verification failed: ${errorMsg}`);
      return {
        isValid: false,
        message: `Failed to connect with Zoom: ${errorMsg}`,
      };
    }
  }

  /**
   * Retrieves importable/syncable resources (scheduled meetings) from Zoom.
   */
  async getResources(connection: ProviderConnection): Promise<ProviderResource[]> {
      return [
        {
          name: "monitor all meetings",
          resourceType:'meetings',
          externalResourceId:"not available",
          metadata:{}
        } as ProviderResource
      ]
  }

  /**
   * Revoke the Zoom OAuth access token.
   * Hits the Zoom API OAuth revoke endpoint.
   */
  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    const token = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.error(
        'Zoom client ID or client secret is missing from environment variables.',
      );
      return;
    }

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const params = new URLSearchParams();
      params.append('token', token);

      const response = await axios.post(
        'https://zoom.us/oauth/revoke',
        params,
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      if (response.status === 200 && response.data?.status === 'success') {
        this.logger.log(
          `Zoom token revoked successfully for connection ${connection.id}`,
        );
      } else {
        this.logger.warn(
          `Zoom token revocation returned unexpected response: ${JSON.stringify(response.data)}`,
        );
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(
        `Failed to reach Zoom API for token revocation: ${errorMsg}`,
      );

    }
  }

  async refreshAccessToken(connection: ProviderConnection): Promise<string> {
    this.logger.log(`Attempting to refresh Zoom access token for connection: ${connection.id}`);
    
    if (!connection.refreshTokenEncrypted) {
      throw new Error('Refresh token is missing from connection.');
    }

    const refreshToken = this.encryptionService.decrypt(connection.refreshTokenEncrypted);
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Zoom client ID or client secret is missing from environment variables.');
    }

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);

      const response = await axios.post('https://zoom.us/oauth/token', params, {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      const newAccessTokenEncrypted = this.encryptionService.encrypt(access_token);
      const newRefreshTokenEncrypted = refresh_token ? this.encryptionService.encrypt(refresh_token) : connection.refreshTokenEncrypted;
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      await this.prismaService.providerConnection.update({
        where: { id: connection.id },
        data: {
          accessTokenEncrypted: newAccessTokenEncrypted,
          refreshTokenEncrypted: newRefreshTokenEncrypted,
          tokenExpiresAt: tokenExpiresAt,
        },
      });

      this.logger.log(`Zoom token refreshed successfully for connection: ${connection.id}`);
      return access_token;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to refresh Zoom access token: ${errorMsg}`);
      throw new Error(`Zoom token refresh failed: ${errorMsg}`);
    }
  }

  async getMeetingDetails(connection: ProviderConnection, meetingId: string): Promise<any> {
    let accessToken = this.encryptionService.decrypt(connection.accessTokenEncrypted);

    try {
      await this.verifyConnection(connection);
      const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to fetch Zoom meeting details: ${errorMsg}`);
      throw new Error(`Failed to fetch Zoom meeting: ${errorMsg}`);
    }
  }

  async listMeetings(
    connection: ProviderConnection,
    type: MeetingType,
    pageSize = 30,
    nextPageToken?: string,
  ): Promise<{
    resources: ProviderResource[];
    nextPageToken: string | null;
    pageSize: number;
    totalRecords: number;
  }> {
    try {
      await this.verifyConnection(connection);
      const accessToken = this.encryptionService.decrypt(connection.accessTokenEncrypted);

      const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          type,
          page_size: pageSize,
          ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
        },
      });

      const meetings = response.data.meetings || [];

      // Map raw Zoom API meeting response to the standard ProviderResource contract
      const resources = meetings.map((meeting: any) => ({
        externalResourceId: meeting.id.toString(),
        name: meeting.topic,
        resourceType: 'meeting',
        metadata: {
          start_time: meeting.start_time,
          duration: meeting.duration,
          timezone: meeting.timezone,
          join_url: meeting.join_url,
        },
      }));

      return {
        resources,
        // Zoom returns an empty string, not null/undefined, when there's no further page
        nextPageToken: response.data.next_page_token ? response.data.next_page_token : null,
        pageSize: response.data.page_size ?? pageSize,
        totalRecords: response.data.total_records ?? resources.length,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to fetch Zoom meetings/resources: ${errorMsg}`);
      throw new Error(`Failed to fetch Zoom resources: ${errorMsg}`);
    }
  }

  async createMeeting(
    connection: any,
    data: {
      topic: string;
      startTime: string;
      durationMinutes: number;
      timezone?: string;
      attendees?: string[];
    },
  ) {
    await this.verifyConnection(connection);

    const accessToken = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: data.topic,
        type: 2,
        start_time: data.startTime,
        duration: data.durationMinutes,
        timezone: data.timezone || 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          approval_type: 0,
          registrants_email_notification: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const meetingData: MeetingData = {
      id: String(response.data.id),
      topic: response.data.topic,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      startTime: response.data.start_time,
      duration: response.data.duration,
    };

    // حفظ الميتنج فى DB
    await this.prismaService.meeting.create({
      data: {
        id: meetingData.id,
        connectionId: connection.id,
        topic: meetingData.topic,
        joinUrl: meetingData.joinUrl,
        startUrl: meetingData.startUrl,
        startTime: new Date(meetingData.startTime),
        duration: meetingData.duration,
      },
    });

    if (data.attendees?.length) {
      await this.addRegistrants(
        connection,
        meetingData.id,
        data.attendees,
        meetingData,
      );
    }

    return meetingData;
  }

  async addRegistrants(
    connection: any,
    meetingId: string,
    attendees: string[],
    meetingData?: MeetingData,
  ): Promise<void> {
    const meeting =
      meetingData ??
      (await this.prismaService.meeting.findUniqueOrThrow({
        where: {
          id: meetingId,
        },
      }));

    const htmlContent = `
      <p>You have been registered for a Zoom meeting.</p>
      <p>Meeting ID: ${meeting.id}</p>
      <p>Topic: ${meeting.topic}</p>
      <p>Start Time: ${meeting.startTime}</p>
      <p>Duration: ${meeting.duration} minutes</p>
      <p><a href="${meeting.joinUrl}">Join Meeting</a></p>
    `;

    const existingRegistrants =
      await this.prismaService.meetingRegistrant.findMany({
        where: {
          meetingId,
        },
        select: {
          email: true,
        },
      });

    const existingEmails = new Set(
      existingRegistrants.map((r) => r.email),
    );

    for (const email of attendees) {
      if (existingEmails.has(email)) {
        continue;
      }

      console.log(htmlContent)
      await this.emailService.sendBrandedEmail(
        email,
        'Meeting Registration',
        htmlContent,
      );

      await this.prismaService.meetingRegistrant.create({
        data: {
          meetingId,
          connectionId: connection.id,
          email,
        },
      });
    }
  }

  async deleteMeeting(connection: any, meetingId: string): Promise<void> {
    const accessToken = this.encryptionService.decrypt(connection.accessTokenEncrypted);

    await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: {
                Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async updateMeeting(
    connection: any,
    meetingId: string,
    fields: {
      topic?: string;
      startTime?: string;
      durationMinutes?: number;
      timezone?: string;
    },
  ): Promise<void> {
    await this.verifyConnection(connection);

    const accessToken = this.encryptionService.decrypt(
      connection.accessTokenEncrypted,
    );

    await axios.patch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        topic: fields.topic,
        start_time: fields.startTime,
        duration: fields.durationMinutes,
        timezone: fields.timezone,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const meeting = await this.prismaService.meeting.update({
      where: { id: meetingId },
      data: {
        ...(fields.topic && { topic: fields.topic }),
        ...(fields.startTime && { startTime: new Date(fields.startTime) }),
        ...(fields.durationMinutes && { duration: fields.durationMinutes }),
      },
    });

    const registrants =
      await this.prismaService.meetingRegistrant.findMany({
        where: {
          meetingId,
        },
      });

    const htmlContent = `
      <p>Your Zoom meeting has been updated.</p>
      <p>Meeting ID: ${meeting.id}</p>
      <p>Topic: ${meeting.topic}</p>
      <p>Start Time: ${meeting.startTime}</p>
      <p>Duration: ${meeting.duration} minutes</p>
      <p><a href="${meeting.joinUrl}">Join Meeting</a></p>
    `;

    for (const registrant of registrants) {
      await this.emailService.sendBrandedEmail(
        registrant.email,
        'Meeting Updated',
        htmlContent,
      );
    }
  }


}