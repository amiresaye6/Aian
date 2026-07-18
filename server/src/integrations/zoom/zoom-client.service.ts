import { Injectable, Logger } from '@nestjs/common';
import { ProviderClient, ProviderConnection, ProviderResource } from '../contracts';
import { EncryptionService } from '../../common/encryption.service';
import axios from 'axios';

@Injectable()
export class ZoomClientService implements ProviderClient {
  private readonly logger = new Logger(ZoomClientService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

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
    try {
      const accessToken = this.encryptionService.decrypt(connection.accessTokenEncrypted);

      const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          type: 'scheduled',
          page_size: 30,
        },
      });

      const meetings = response.data.meetings || [];

      // Map raw Zoom API meeting response to the standard ProviderResource contract
      return meetings.map((meeting: any) => ({
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
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to fetch Zoom meetings/resources: ${errorMsg}`);
      throw new Error(`Failed to fetch Zoom resources: ${errorMsg}`);
    }
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
}