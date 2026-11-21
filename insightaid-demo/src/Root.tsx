import { Composition } from 'remotion'
import { InsightAidDemo } from './Video'
import { VIDEO } from './theme'
import { LocalShopWorkflow, LS_TOTAL } from './workflow/LocalShopWorkflow'
import { StartupWorkflow, BS_TOTAL } from './workflow/StartupWorkflow'
import { InsightAidCompetition, COMP_TOTAL } from './competition/Competition'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="InsightAidDemo"
      component={InsightAidDemo}
      durationInFrames={VIDEO.frames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* The two pathway workflow videos, built from real captures of the app. */}
    <Composition id="LocalShopWorkflow" component={LocalShopWorkflow} durationInFrames={LS_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="InsightAidCompetition" component={InsightAidCompetition} durationInFrames={COMP_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="StartupWorkflow" component={StartupWorkflow} durationInFrames={BS_TOTAL} fps={30} width={1920} height={1080} />
  </>
)
