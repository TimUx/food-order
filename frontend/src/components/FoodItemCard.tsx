import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { FoodItem } from '@/types';
import { formatPrice, getImageUrl } from '@/services/api';
import { QuantitySelector } from './QuantitySelector';

interface FoodItemCardProps {
  item: FoodItem;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  showSelector?: boolean;
}

export function FoodItemCard({
  item,
  quantity,
  onQuantityChange,
  showSelector = true,
}: FoodItemCardProps) {
  const imageUrl = getImageUrl(item.imageUrl);
  const maxQty = item.maxQuantity ?? 99;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {imageUrl && (
        <CardMedia
          component="img"
          height="160"
          image={imageUrl}
          alt={item.name}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="h3" fontWeight={700}>
            {item.name}
          </Typography>
          <Typography variant="h6" color="primary" fontWeight={700}>
            {formatPrice(Number(item.price))}
          </Typography>
        </Box>
        {item.description && (
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        )}
        {item.soldOut && (
          <Chip label="Ausverkauft" color="error" size="small" />
        )}
        {showSelector && !item.soldOut && (
          <Box sx={{ mt: 'auto', pt: 1, display: 'flex', justifyContent: 'center' }}>
            <QuantitySelector
              value={quantity}
              onChange={onQuantityChange}
              max={maxQty}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
