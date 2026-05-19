export declare const Badge: (props: BadgeProps & { variant?: BadgeVariants | undefined; } & { children?: React.ReactNode; }) => React.JSX.Element;
export declare const badgeVariants: typeof badgeVariants;
export type BadgeVariants = "default" | "secondary" | "destructive" | "outline" | "muted";
export declare const BADGE_VARIANTS: BadgeVariants[];

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: BadgeVariants;
    children?: React.ReactNode;
}

declare const badgeVariants: {
    (props: { variant?: "default" | "secondary" | "destructive" | "outline" | "muted" | undefined; }): string;
};
