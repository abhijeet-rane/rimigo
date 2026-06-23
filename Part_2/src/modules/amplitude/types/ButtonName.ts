export interface ButtonEventConfig {
    buttonPage?: string
    buttonName?: string
    buttonAction?: string
}

export const getButtonEventName = ({ buttonPage, buttonName, buttonAction }: ButtonEventConfig) => {
    // Filter out empty or falsy values, lowercase each
    const parts = [buttonPage, buttonAction, buttonName].filter(Boolean).map((part) => part!.toLowerCase())

    // Join with colon
    return parts.join(':')
}
