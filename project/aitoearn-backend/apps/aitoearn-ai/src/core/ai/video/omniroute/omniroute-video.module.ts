import { DynamicModule, Module } from '@nestjs/common'
import { OmniRouteConfig, OmniRouteLibModule } from '../../libs/omniroute'
import { ModelsConfigModule } from '../../models-config'
import { OmniRouteVideoService } from './omniroute-video.service'

@Module({})
export class OmniRouteVideoModule {
  static forRoot(config?: OmniRouteConfig): DynamicModule {
    if (!config) {
      return { module: OmniRouteVideoModule }
    }

    return {
      module: OmniRouteVideoModule,
      imports: [
        OmniRouteLibModule.forRoot(config),
        ModelsConfigModule,
      ],
      providers: [OmniRouteVideoService],
      exports: [OmniRouteVideoService],
    }
  }
}
