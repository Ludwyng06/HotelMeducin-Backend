import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }
}

