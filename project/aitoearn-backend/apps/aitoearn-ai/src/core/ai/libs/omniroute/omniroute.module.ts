import { DynamicModule, Module } from '@nestjs/common'
import { OmniRouteConfig } from './omniroute.config'
import { OmniRouteLibService } from './omniroute.service'

@Module({})
export class OmniRouteLibModule {
  static forRoot(config?: OmniRouteConfig): DynamicModule {
    if (!config) {
      return { module: OmniRouteLibModule }
    }

    return {
      global: true,
      module: OmniRouteLibModule,
      providers: [
        {
          provide: OmniRouteConfig,
          useValue: config,
        },
        OmniRouteLibService,
      ],
      exports: [OmniRouteLibService],
    }
  }
}
