import { Composition, Still } from "remotion";
import "./theme";
import { DURATION, LaunchVideo } from "./Video";
import { Marquee, PromoSmall, ShotGoal, ShotGoals, ShotPopup, ShotSocial, ShotYouTube } from "./Store";

export function Root() {
  return (
    <>
      <Composition id="FeedFilter" component={LaunchVideo} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
      {/* Chrome Web Store art; render with scripts/store.sh */}
      <Still id="store-1-youtube" component={ShotYouTube} width={1280} height={800} />
      <Still id="store-2-social" component={ShotSocial} width={1280} height={800} />
      <Still id="store-3-goal" component={ShotGoal} width={1280} height={800} />
      <Still id="store-4-goals" component={ShotGoals} width={1280} height={800} />
      <Still id="store-5-popup" component={ShotPopup} width={1280} height={800} />
      <Still id="store-promo-small" component={PromoSmall} width={440} height={280} />
      <Still id="store-marquee" component={Marquee} width={1400} height={560} />
    </>
  );
}
