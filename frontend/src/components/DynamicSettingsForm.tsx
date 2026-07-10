import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SettingsFormDefinition, SettingsFormField, SettingsFormGroup } from '@/types/settings';

interface DynamicSettingsFormProps {
  form: SettingsFormDefinition;
  onChange: (groups: SettingsFormGroup[]) => void;
  disabled?: boolean;
}

function updateField(
  groups: SettingsFormGroup[],
  groupId: string,
  fieldKey: string,
  value: unknown
): SettingsFormGroup[] {
  return groups.map((group) => {
    if (group.id !== groupId) return group;
    return {
      ...group,
      fields: group.fields.map((field) =>
        field.key === fieldKey ? { ...field, value } : field
      ),
    };
  });
}

function renderField(
  field: SettingsFormField,
  groupId: string,
  onFieldChange: (groupId: string, key: string, value: unknown) => void,
  disabled?: boolean
) {
  const common = {
    fullWidth: true,
    disabled,
    helperText: field.helpText ?? field.description,
    required: field.required,
  };

  switch (field.type) {
    case 'boolean':
      return (
        <FormControl key={field.key} fullWidth>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(field.value)}
                onChange={(e) => onFieldChange(groupId, field.key, e.target.checked)}
                disabled={disabled}
              />
            }
            label={field.label}
          />
          {common.helperText && <FormHelperText>{common.helperText}</FormHelperText>}
        </FormControl>
      );
    case 'select':
      return (
        <FormControl key={field.key} fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            label={field.label}
            value={String(field.value ?? '')}
            onChange={(e) => onFieldChange(groupId, field.key, e.target.value)}
            disabled={disabled}
          >
            {(field.options ?? []).map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
          {common.helperText && <FormHelperText>{common.helperText}</FormHelperText>}
        </FormControl>
      );
    case 'text':
      return (
        <TextField
          key={field.key}
          label={field.label}
          value={String(field.value ?? '')}
          onChange={(e) => onFieldChange(groupId, field.key, e.target.value)}
          multiline
          minRows={3}
          {...common}
        />
      );
    case 'number':
      return (
        <TextField
          key={field.key}
          label={field.label}
          type="number"
          value={field.value ?? ''}
          onChange={(e) => onFieldChange(groupId, field.key, Number(e.target.value))}
          {...common}
        />
      );
    case 'password':
      return (
        <TextField
          key={field.key}
          label={field.label}
          type="password"
          value={String(field.value ?? '')}
          placeholder={field.masked ? '••••••••' : undefined}
          onChange={(e) => onFieldChange(groupId, field.key, e.target.value)}
          {...common}
        />
      );
    default:
      return (
        <TextField
          key={field.key}
          label={field.label}
          type={field.type === 'email' ? 'email' : 'text'}
          value={String(field.value ?? '')}
          onChange={(e) => onFieldChange(groupId, field.key, e.target.value)}
          {...common}
        />
      );
  }
}

function renderGroup(
  group: SettingsFormGroup,
  onFieldChange: (groupId: string, key: string, value: unknown) => void,
  disabled?: boolean
) {
  return (
    <Box key={group.id}>
      <Typography variant="h6" fontWeight={600} gutterBottom>{group.label}</Typography>
      {group.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{group.description}</Typography>
      )}
      <Stack spacing={2}>
        {group.fields.map((field) => renderField(field, group.id, onFieldChange, disabled))}
      </Stack>
    </Box>
  );
}

export function DynamicSettingsForm({ form, onChange, disabled }: DynamicSettingsFormProps) {
  const handleFieldChange = (groupId: string, key: string, value: unknown) => {
    onChange(updateField(form.groups, groupId, key, value));
  };

  const primaryGroups = form.groups.filter((g) => !g.advanced);
  const advancedGroups = form.groups.filter((g) => g.advanced);

  return (
    <Stack spacing={4}>
      {form.description && (
        <Typography variant="body2" color="text.secondary">{form.description}</Typography>
      )}
      {primaryGroups.map((group) => renderGroup(group, handleFieldChange, disabled))}
      {advancedGroups.length > 0 && (
        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={600}>Erweitert</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={4}>
              {advancedGroups.map((group) => renderGroup(group, handleFieldChange, disabled))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}
