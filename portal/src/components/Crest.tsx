// Герб колледжа. Используется на экране входа и в шапке.
/* eslint-disable @next/next/no-img-element */
export function Crest({ className = "size-12" }: { className?: string }) {
  return <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/crest.jpg`} alt="Герб Налогового колледжа" className={`${className} object-contain`} />;
}
