import { FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { PublicEvent } from '@/types';
import { touchSelectSx } from '@/theme/touch';

type StaffEventSelectProps = {
  events: PublicEvent[];
  value: string;
  onChange: (eventId: string) => void;
  labelId: string;
  sx?: SxProps<Theme>;
};

export function StaffEventSelect({ events, value, onChange, labelId, sx }: StaffEventSelectProps) {
  return (
    <FormControl fullWidth sx={sx ? [touchSelectSx, sx] : touchSelectSx}>
      <InputLabel id={labelId} shrink>
        Veranstaltung
      </InputLabel>
      <Select
        labelId={labelId}
        label="Veranstaltung"
        value={value}
        onChange={(e) => onChange(String(e.target.value))}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography component="span" color="text.secondary" sx={{ fontSize: '1.15rem' }}>
                Veranstaltung wählen
              </Typography>
            );
          }
          const event = events.find((item) => item.id === selected);
          return event ? `${event.name} · ${event.eventDateLabel}` : selected;
        }}
      >
        {events.map((event) => (
          <MenuItem key={event.id} value={event.id}>
            {event.name} · {event.eventDateLabel}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
