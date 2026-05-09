interface PageHeroProps {
  eyebrow: string
  title: string
  description?: string
}

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <div className="text-center mb-16 animate-blur-in">
      <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
        {eyebrow}
      </span>
      <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </div>
  )
}
