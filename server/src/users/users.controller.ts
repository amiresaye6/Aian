import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { UsersService } from './users.service';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { UserEntity } from './user.entity';
import { AuthGaurd } from '../auth/auth.gaurd';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '@prisma/client';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';
import { RolesGaurds } from '../roles_permissions/roles.gaurd';



@UseGuards(AuthGaurd,RolesGaurds)
@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService:UsersService
    ){}

    @RequiredPermissions('users.read')
    @Get('/:id')
    async findOne(@Param('id') id:string){
        try{
            const user= await this.usersService.findOneById(id);
            return {user:new UserEntity(user)};
        }catch(error:any){
            this.handleException(error);
        }
    }

    @Get()
    @RequiredPermissions('users.read')
    async findAllOrOneByEmail(@Query('email') email:string,@CurrentUser()user:any){
        console.log(user)
        if(email){
                try{
                const user= await this.usersService.findOneByEmail(email);
                if(!user){
                    throw new NotFoundException('user not found')
                }
                return {user:new UserEntity(user)};
            }catch(error:any){
                this.handleException(error);
            }
        }else{
            const users= await this.usersService.findAll();
            return {users:users.map(user => new UserEntity(user))}
        }
    }
    
    @RequiredPermissions('users.update')
    @Patch('/:id')
    async updateUser(@Param('id') id:string,@Body() body:UpdateUserDTO){
        try{
            const user= await this.usersService.updateUser(id,body);
            return {user:new UserEntity(user)};
        }catch(error:any){
            this.handleException(error);
        }
    }

    @RequiredPermissions('users.delete')
    @Delete('/:id')
    async deleteUser(@Param('id') id:string){
        try{
            const deletedUser= await this.usersService.delete(id);
            return deletedUser
        }catch(error:any){
            this.handleException(error);
        }
    }



    private handleException(error: any) {
        if (error.message === "user not found") {
            throw new NotFoundException({
                success: false,
                message: error.message,
                error:{type:'NotFoundException'}
            });
        }
        throw new BadRequestException({
            success: false,
            message: error.message,
            error:{type:'BadRequestException'}
        });
    }
}
