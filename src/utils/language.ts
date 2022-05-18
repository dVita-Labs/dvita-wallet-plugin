export type Language = 'en';
export const languages: Language[] = ['en'];

export function getValidLanguage(maybeLang: any): Language {
    return languages.includes(maybeLang)
        ? maybeLang
        : languages[0];
}
