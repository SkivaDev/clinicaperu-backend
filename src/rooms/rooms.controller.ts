import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { RoomResponseDto } from './dto/room-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/clinics/:clinicId/rooms') // flujo esperado de administración es "entro a la clínica y gestiono sus rooms"
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(
    @Param('clinicId') clinicId: string,
    @Body() createRoomDto: CreateRoomDto,
  ): Promise<ResponseDto<RoomResponseDto>> {
    const room = await this.roomsService.create(clinicId, createRoomDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Room created successfully',
      data: room,
    };
  }

  @Get()
  async findAll(
    @Param('clinicId') clinicId: string,
  ): Promise<ResponseDto<RoomResponseDto[]>> {
    const rooms = await this.roomsService.listRoomsByClinic(clinicId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Rooms found successfully',
      data: rooms,
    };
  }

  @Get(':roomId')
  async findOne(
    @Param('clinicId') clinicId: string,
    @Param('roomId') roomId: string,
  ): Promise<ResponseDto<RoomResponseDto>> {
    const room = await this.roomsService.getRoomById(clinicId, roomId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Room found successfully',
      data: room,
    };
  }

  @Patch(':roomId')
  async update(
    @Param('clinicId') clinicId: string,
    @Param('roomId') roomId: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ): Promise<ResponseDto<RoomResponseDto>> {
    const room = await this.roomsService.updateRoomByClinic(
      clinicId,
      roomId,
      updateRoomDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Room updated successfully',
      data: room,
    };
  }

  @Delete(':roomId')
  async remove(
    @Param('clinicId') clinicId: string,
    @Param('roomId') roomId: string,
  ): Promise<ResponseDto<RoomResponseDto>> {
    const room = await this.roomsService.removeRoom(clinicId, roomId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Room deleted successfully',
      data: room,
    };
  }
}
