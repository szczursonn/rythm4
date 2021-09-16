const usetube = require('usetube')

export const search = async (searchphrase: string): Promise<string> => {
    const id = (await usetube.searchVideo(searchphrase)).videos[0].id
    return `https://www.youtube.com/watch?v=${id}`
}