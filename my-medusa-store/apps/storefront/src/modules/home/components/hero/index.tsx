import { Heading } from "@modules/common/components/ui";

const Hero = () => {
  return (
    <div className="h-[40vh] w-full border-b border-ui-border-base relative bg-gradient-to-r from-neutral-900 to-neutral-800 text-white flex items-center justify-center">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#3c3c3c_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="relative z-10 flex flex-col justify-center items-center text-center p-8 gap-4 max-w-2xl">
        <Heading
          level="h1"
          className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400"
        >
          Discover Our Collection
        </Heading>
        <p className="text-neutral-400 text-base md:text-lg max-w-md font-light leading-relaxed">
          Premium products curated with exceptional quality and modern aesthetics.
        </p>
      </div>
    </div>
  );
};

export default Hero;
