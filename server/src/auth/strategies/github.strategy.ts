import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: `${process.env.SERVER_URL}/api/v1/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { displayName, username, emails, photos } = profile;
    const email =
      emails && emails[0] ? emails[0].value : `${username}@github.com`;

    const user = {
      email: email,
      fullName: displayName || username,
      picture: photos && photos[0] ? photos[0].value : null,
      accessToken,
    };
    done(null, user);
  }
}
