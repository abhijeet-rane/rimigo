interface UserUpdateRequestAdapterProps {
    name: string
    email?: string
    answers: {
        your_gender: string[]
    }
}

export const userUpdateRequestAdapter = (data: UserUpdateRequestAdapterProps) => {
    if (!data.name || !data.answers.your_gender) {
        return null
    }

    if (typeof data.name !== 'string') {
        return null
    }
    // remove extra spaces from start and end and remove special characters from name
    const sanitizedName = data.name.trim()

    const payload: {
        name: string
        gender: string
        email?: string
    } = {
        name: sanitizedName,
        gender: data.answers.your_gender[0] as string
    }

    // Add email if provided and not empty
    if (data.email && data.email.trim() !== '') {
        payload.email = data.email
    }

    return payload
}
