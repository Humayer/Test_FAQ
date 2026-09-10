import Image from "next/image";

export function Logo({ className = "", height = 28 }: { className?: string; height?: number }) {
  const width = Math.round((842 / 381) * height);
  return (
    <Image
      src="/datapath-logo.jpg"
      alt="Datapath"
      width={width}
      height={height}
      priority
      className={className}
      style={{ height, width: "auto", objectFit: "contain", mixBlendMode: "multiply" }}
    />
  );
}
