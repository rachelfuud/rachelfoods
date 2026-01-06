export interface ThemeConfig {
    id: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    defaultMode: 'light' | 'dark';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateThemeDto {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    defaultMode?: 'light' | 'dark';
}
