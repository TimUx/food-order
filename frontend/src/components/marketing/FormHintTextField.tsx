import { Box, IconButton, TextField, Tooltip, Typography, type TextFieldProps } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ApplicationFieldHint } from '@/content/tenantApplicationHints';

interface FormHintTextFieldProps extends Omit<TextFieldProps, 'label'> {
  label: string;
  hint: ApplicationFieldHint;
}

export function FormHintTextField({ label, hint, ...textFieldProps }: FormHintTextFieldProps) {
  return (
    <TextField
      {...textFieldProps}
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {label}
          <Tooltip
            title={
              <Box sx={{ p: 0.5, maxWidth: 320 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
                  {hint.title}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {hint.example}
                </Typography>
              </Box>
            }
            arrow
            placement="top-start"
            enterTouchDelay={0}
            describeChild
          >
            <IconButton
              component="span"
              size="small"
              aria-label={`Hinweis zu ${label}`}
              onMouseDown={(e) => e.preventDefault()}
              sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    />
  );
}
