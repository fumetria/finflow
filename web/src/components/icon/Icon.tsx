import { cn } from '@/lib/utils';
import { ICON_PATHS, type IconName } from './icons.gen';

export type { IconName };

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  /** Accessible label. When omitted the icon is treated as decorative. */
  title?: string;
} & Omit<React.SVGProps<SVGSVGElement>, 'name' | 'title'>;

/**
 * Renders a duotone icon from the finflow icon set. Each glyph is a pair of
 * `.primary` / `.secondary` paths that inherit the current text color (see the
 * `.finflow-icon` rules in index.css), so `text-*` utilities tint them just
 * like any other inline SVG.
 */
export function Icon({ name, size = 20, className, title, ...rest }: IconProps) {
  const markup = ICON_PATHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('finflow-icon inline-block shrink-0', className)}
      dangerouslySetInnerHTML={{ __html: markup }}
      {...rest}
    />
  );
}
