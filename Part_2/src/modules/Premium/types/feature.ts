type IconFeature = {
  type: "icon"
  title: string
  subtitle: string
  icon: React.ElementType
}

type StackedFeature = {
  type: "stacked"
  title: string
  subtitle: string
  images: string[]
}

export type Feature = IconFeature | StackedFeature