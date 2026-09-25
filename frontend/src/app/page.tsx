import Link from 'next/link';
import { ExploreRooms } from '@/components/ExploreRooms';
import { RedirectIfSignedIn } from '@/components/RedirectIfSignedIn';

function LogoMark({ size }: { size: 'sm' | 'lg' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-accent ${
        size === 'lg' ? 'h-[34px] w-[34px] rounded-[10px]' : 'h-[22px] w-[22px] rounded-[7px]'
      }`}
    >
      <span
        className={`font-display font-bold text-white ${size === 'lg' ? 'text-lg' : 'text-xs'}`}
      >
        C
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <RedirectIfSignedIn />

      <div className="relative flex h-[640px] shrink-0 flex-col overflow-hidden max-sm:h-[560px]">
        <div className="absolute inset-0 bg-[#131317] bg-[image:radial-gradient(900px_500px_at_85%_-10%,rgba(124,92,255,0.28),rgba(15,15,18,0)_60%),radial-gradient(700px_420px_at_10%_30%,rgba(47,214,117,0.22),rgba(15,15,18,0)_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,15,18,0)_35%,#0F0F12_96%)]" />

        <nav className="relative flex items-center justify-between px-16 py-8 max-sm:px-5 max-sm:py-5">
          <div className="flex items-center gap-2.5">
            <LogoMark size="lg" />
            <span className="font-display text-[19px] font-bold text-foreground max-sm:text-base">
              Clashing Grounds
            </span>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-white/16 bg-white/8 px-6 py-2.75 text-sm font-bold text-foreground hover:bg-white/12"
          >
            Log In
          </Link>
        </nav>

        <div className="relative mt-auto flex max-w-[760px] flex-col gap-5 px-16 pb-[76px] max-sm:px-5 max-sm:pb-14">
          <h1 className="font-display text-[58px] leading-[1.08] font-bold text-white max-sm:text-[38px]">
            Create a room.
            <br />
            Bring your crew.
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-[#C7C7CE] max-sm:text-base">
            Design your character, chat by voice or text, and hang out with friends in a room you
            host.
          </p>
          <div className="mt-2 flex">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-8 py-3.75 text-base font-extrabold text-white hover:bg-[#58E497]"
            >
              Start Talking
            </Link>
          </div>
        </div>
      </div>

      <section className="px-16 pt-14 pb-[100px] max-sm:px-5 max-sm:pb-16">
        <h2 className="font-display text-[26px] font-bold text-foreground">Explore rooms</h2>
        <p className="mt-1.5 mb-7 text-[15px] text-[#9A9AA5]">Pick a room, jump right in.</p>
        <ExploreRooms />
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-[#212127] px-16 py-7 max-sm:px-5">
        <div className="flex items-center gap-2">
          <LogoMark size="sm" />
          <span className="text-[13px] text-[#6E6E78]">© Clashing Grounds</span>
        </div>
        <div className="flex gap-5 text-[13px] font-bold">
          <Link href="/login" className="text-accent hover:text-[#58E497] hover:underline">
            Log In
          </Link>
          <Link href="/signup" className="text-accent hover:text-[#58E497] hover:underline">
            Sign Up
          </Link>
        </div>
      </footer>
    </div>
  );
}
