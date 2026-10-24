import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../identity';
import { LocationSnapshotService } from '../location-snapshot.service';
import type { CreateLocationSnapshotDto } from '../dto/profile.dto';

@Controller('location/snapshots')
@UseGuards(AuthGuard)
export class LocationSnapshotController {
  constructor(private readonly snapshotService: LocationSnapshotService) {}

  @Post()
  async createSnapshot(@Req() req: AuthenticatedRequest, @Body() dto: CreateLocationSnapshotDto) {
    return this.snapshotService.createSnapshot(req.user.id, dto);
  }

  @Get(':snapshotId')
  async getSnapshot(@Req() req: AuthenticatedRequest, @Param('snapshotId') snapshotId: string) {
    const isProvider = req.user.roles.includes('PROVIDER');
    const isAdmin = req.user.roles.includes('ADMIN');
    const role = isAdmin ? 'ADMIN' : isProvider ? 'PROVIDER' : 'CUSTOMER';

    return this.snapshotService.getSnapshotForCaller(snapshotId, role);
  }
}
