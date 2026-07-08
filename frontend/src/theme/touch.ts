import { SxProps, Theme } from '@mui/material';

/** Mindestgröße für Touch-Ziele (WCAG / Mobile Best Practice) */
export const TOUCH_MIN = 56;

export const touchFieldSx: SxProps<Theme> = {
  '& .MuiInputBase-root': {
    minHeight: TOUCH_MIN,
    fontSize: '1.15rem',
  },
  '& .MuiInputLabel-root': {
    fontSize: '1rem',
  },
};

export const touchButtonSx: SxProps<Theme> = {
  minHeight: TOUCH_MIN,
  fontSize: '1.15rem',
  fontWeight: 700,
  borderRadius: 2,
  px: 3,
};

export const touchPrimaryButtonSx: SxProps<Theme> = {
  ...touchButtonSx,
  minHeight: 72,
  fontSize: '1.25rem',
};

export const touchSquareActionSx: SxProps<Theme> = {
  aspectRatio: '1 / 1',
  minHeight: { xs: 140, sm: 180, md: 220 },
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.5,
  fontSize: { xs: '1.25rem', sm: '1.5rem' },
  fontWeight: 800,
  borderRadius: 3,
  textTransform: 'none',
  '& .MuiButton-startIcon': {
    margin: 0,
  },
  '& .MuiSvgIcon-root': {
    fontSize: { xs: 48, sm: 56, md: 64 },
  },
};

export const touchIconButtonSx: SxProps<Theme> = {
  minWidth: TOUCH_MIN,
  minHeight: TOUCH_MIN,
  width: TOUCH_MIN,
  height: TOUCH_MIN,
  borderRadius: 2,
};
