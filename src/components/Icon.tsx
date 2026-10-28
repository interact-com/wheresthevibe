import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Stroke icons drawn to match the design canvas, so we don't need an icon font.
export type IconName =
  | 'compass'
  | 'ticket'
  | 'plus'
  | 'user'
  | 'pin'
  | 'search'
  | 'back'
  | 'close'
  | 'share'
  | 'calendar'
  | 'star'
  | 'bolt'
  | 'scan'
  | 'bell'
  | 'check'
  | 'chat'
  | 'lock'
  | 'image';

type Props = { name: IconName; size?: number; color?: string; fill?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = colors.text, fill = 'none', strokeWidth = 2 }: Props) {
  const p = { stroke: color, strokeWidth, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'compass' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...p} />
        </>
      )}
      {name === 'ticket' && <Path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z" {...p} />}
      {name === 'plus' && (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={5} {...p} />
          <Path d="M12 8v8M8 12h8" {...p} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" {...p} />
          <Circle cx={12} cy={10} r={2.5} {...p} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Path d="M20 20l-4-4" {...p} />
        </>
      )}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'share' && <Path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" {...p} />}
      {name === 'calendar' && (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={3} {...p} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...p} />
        </>
      )}
      {name === 'star' && (
        <Path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6z" {...p} fill={fill} />
      )}
      {name === 'bolt' && <Path d="M13 2L4 14h7l-1 8 9-12h-7z" {...p} fill={fill} />}
      {name === 'scan' && <Path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16" {...p} />}
      {name === 'bell' && <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" {...p} />}
      {name === 'check' && <Path d="M5 12l5 5 9-10" {...p} />}
      {name === 'chat' && <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" {...p} />}
      {name === 'lock' && (
        <>
          <Rect x={5} y={10} width={14} height={10} rx={2} {...p} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...p} />
        </>
      )}
      {name === 'image' && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={3} {...p} />
          <Circle cx={9} cy={10} r={2} {...p} />
          <Path d="M21 16l-5-5-8 8" {...p} />
        </>
      )}
    </Svg>
  );
}
