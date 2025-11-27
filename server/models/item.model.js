import { z } from "zod";

// // define a schema
// export const itemSchema = z.object({
//   item_id: z.string(),
//   item_name: z.string(),
//   item_description: z.string(),
//   brand: z.string(),
//   manufacturer_address: z.object({
//     street: z.string(),
//     city: z.string(),
//     state: z.string(),
//     postal_code: z.string(),
//     country: z.string(),
//   }),
//   prices: z.object({
//     full_price: z.number(),
//     sale_price: z.number(),
//   }),
//   categories: z.array(z.string()),
//   user_reviews: z.array(
//     z.object({
//       review_date: z.string(),
//       rating: z.number(),
//       comment: z.string(),
//     })
//   ),
//   notes: z.string(),
// });

// Home Decor
export const itemSchema = z.object({
  item_id: z.string(),
  sku: z.string().optional(),

  item_name: z.string().min(2),
  item_description: z.string().min(10),

  brand: z.string(),
  materials: z.array(z.string()).optional(),
  color: z.string().optional(),

  dimensions: z
    .object({
      width_cm: z.number().positive(),
      height_cm: z.number().positive(),
      depth_cm: z.number().positive(),
    })
    .optional(),

  weight_kg: z.number().positive().optional(),

  manufacturer_address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),

  prices: z.object({
    full_price: z.number().positive(),
    sale_price: z.number().positive(),
  }),

  stock_quantity: z.number().int().nonnegative(),

  categories: z.array(z.string()),

  user_reviews: z.array(
    z.object({
      review_date: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
    })
  ),

  notes: z.string(),
});
