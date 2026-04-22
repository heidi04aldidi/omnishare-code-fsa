import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      service: 'OmniShare Asset Engine',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
