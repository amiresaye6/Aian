import { BadRequestException, ClassSerializerInterceptor, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException, UseInterceptors } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { error } from 'console';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService:UsersService,
        private readonly prismaService:PrismaService,
        private readonly jwtService:JwtService
    ){}

    async SignUp(fullName: string, email: string, password: string, confirmPassword: string){

        if(password!==confirmPassword){
            throw new BadRequestException({
                success:false,
                message:'password and confirm password are not matched',
                error:{type:'BadRequestException'}
            })
        }

        const existedUser= await this.usersService.findOneByEmail(email);
        if(existedUser){
            throw new BadRequestException({
                success:false,
                message:'user is already exist',
                error:{type:'BadRequestException'}
            })
        }

        const passwordHash=await bcrypt.hash(password,10);
        const user= await this.usersService.create(fullName,email,passwordHash);
        return user;
    }

    async SignIn(email:string, password:string){
        const existedUser= await this.usersService.findOneByEmail(email);
        if(!existedUser){
            throw new UnauthorizedException({
                success:false,
                message:'invalid email or password',
                error:{type:'UnauthorizedException'}
            })
        }

        const isMatched= await bcrypt.compare(password, existedUser.passwordHash as string)
        if(!isMatched){
            throw new UnauthorizedException({
                success:false,
                message:'invalid email or password',
                error:{type:'UnauthorizedException'}
            })
        }

        let payload={
            id:existedUser.id,
            email:existedUser.email,
            fullName:existedUser.fullName,
            roleId:existedUser.roleId||'unkown',
            role:existedUser.role?.name||'unkown',
            organizationId:existedUser.organizationId||'unkown',
            organization:existedUser.organization?.name||'unkown'
        }

        const {access_token,refresh_token}= await this.getTokens(payload);
        this.updateRefreshToken(existedUser.id,refresh_token);

        return {user:payload,access_token,refresh_token} 
    }

    async getTokens(payload:any){
        const [access_token,refresh_token]= await Promise.all([
            this.jwtService.signAsync(payload,{
                secret:process.env.JWT_SECRET,
                expiresIn:'1h'
            }),
            this.jwtService.signAsync(payload,{
                secret:process.env.JWT_SECRET_REFRESH_TOKEN,
                expiresIn:'30d'
            }),

        ])
        return {access_token,refresh_token}
    }

    async updateRefreshToken(userid:string,refreshToken:string){
        const newrefreshTokenHash = await bcrypt.hash(refreshToken,10)
        await this.prismaService.user.update({
            where:{id:userid},
            data:{refreshTokenHash:newrefreshTokenHash}
        })
    }

    async checkRefreshTokens(userid:string,refreshToken:string){
        try {
            await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_SECRET_REFRESH_TOKEN,
            });
        } catch (error:any) {
            throw new ForbiddenException({ success: false, message: 'Expired or invalid refresh token',error:{message:error.message} });
        }

        const user = await this.prismaService.user.findUnique({
            where:{id:userid},
            include: {
                role: {
                    select: {
                    id: true,  
                    name: true,
                    }
                },
                organization: {
                    select: {
                        id:true,
                        name:true
                    }
                }
            }
        });
        if (!user || !user.refreshTokenHash) {
            throw new ForbiddenException({
                success:false,
                message:'Access denied'
            });
        }
        const isMatched= await bcrypt.compare(refreshToken, user.refreshTokenHash as string);
        if(!isMatched){
            throw new ForbiddenException({
                success:false,
                message:'Access denied',
                error:{message:'Refresh token does not match'}
            });
        }

        let payload={
            id:user.id,
            email:user.email,
            fullName:user.fullName,
            roleId:user.roleId||'unkown',
            role:user.role?.name||'unkown',
            organizationId:user.organizationId||'unkown',
            organization:user.organization?.name||'unkown'
        }

        const {access_token,refresh_token} = await this.getTokens(payload)
        this.updateRefreshToken(userid,refresh_token);
        return {access_token,refresh_token};
    }

    async logOut(userId:string){
        await this.prismaService.user.update({
            where:{id:userId},
            data:{refreshTokenHash:null}
        })
    }

    async changePassword(userId:string,oldPassword:string,newPassword:string,confirmNewPassword:string){
        if(newPassword!==confirmNewPassword){
            throw new BadRequestException("password doesn't match confirm-password")
        }
        if(oldPassword===newPassword){
            throw new BadRequestException("new password can't be the old one")
        }
        const user= await this.usersService.findOneById(userId);
        if(!user){
            throw new NotFoundException('user not found');
        }
        const isMatched= await bcrypt.compare(oldPassword,user.passwordHash as string);
        if(!isMatched){
            throw new UnauthorizedException('wrong password');
        }

        const newHash= await bcrypt.hash(newPassword,10);
        const updatedUser=await this.prismaService.user.update({
            where:{id:userId},
            data:{passwordHash:newHash}
        })
        return updatedUser;

    }

    async validateOAuthUser(oauthUser: { email: string; fullName: string }) {
    let user = await this.usersService.findOneByEmail(oauthUser.email);

    if (!user) {
        user = await this.usersService.create(
        oauthUser.fullName,
        oauthUser.email,
        '', 
        )as any;
    }
    if(!user){
        throw new ConflictException("couldn't authenticate")
    }

    let payload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        role: (user as any).role?.name || 'unknown',
    };

    const { access_token, refresh_token } = await this.getTokens(payload);
    await this.updateRefreshToken(user.id, refresh_token);

    return { user: payload, access_token, refresh_token };
    }
}
