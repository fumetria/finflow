import * as z from 'zod';

export const forecastQuerySchema = z.object({
  date: z.iso.date().optional(),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
