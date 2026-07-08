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
  touchMode?: boolean;
}

export function FoodItemCard({
  item,
  quantity,
  onQuantityChange,
  showSelector = true,
  touchMode = false,
}: FoodItemCardProps) {
  const imageUrl = getImageUrl(item.imageUrl);
  const maxQty = item.maxQuantity ?? 99;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: touchMode ? 3 : undefined }}>
      {imageUrl && (
        <CardMedia
          component="img"
          height={touchMode ? 140 : 160}
          image={imageUrl}
          alt={item.name}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: touchMode ? 1.5 : 1, p: touchMode ? 2.5 : 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant={touchMode ? 'h5' : 'h6'} component="h3" fontWeight={700}>
            {item.name}
          </Typography>
          <Typography variant={touchMode ? 'h5' : 'h6'} color="primary" fontWeight={700} sx={{ flexShrink: 0 }}>
            {formatPrice(Number(item.price))}
          </Typography>
        </Box>
        {item.description && (
          <Typography variant={touchMode ? 'body1' : 'body2'} color="text.secondary">
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
              size={touchMode ? 'touch' : 'large'}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
