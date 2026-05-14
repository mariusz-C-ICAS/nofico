import { useState } from 'react';
import { z } from 'zod';

const JournalItemSchema = z.object({
  accountId: z.string().min(1, "Wybierz konto"),
  accountCode: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  side: z.enum(['Wn', 'Ma'])
});

const JournalEntrySchema = z.object({
  date: z.string(),
  documentNumber: z.string().min(1, "Nr dowodu jest wymagany"),
  description: z.string().min(3, "Opis jest za krótki"),
  items: z.array(JournalItemSchema).min(2, "Minimum 2 pozycje dekretu")
}).refine(data => {
  const totalWn = data.items.filter(i => i.side === 'Wn').reduce((sum, i) => sum + i.debit, 0);
  const totalMa = data.items.filter(i => i.side === 'Ma').reduce((sum, i) => sum + i.credit, 0);
  return Math.abs(totalWn - totalMa) < 0.01;
}, {
  message: "Suma Wn musi równać się sumie Ma"
});

export function useJournalEntry() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: any) => {
    try {
      JournalEntrySchema.parse(data);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        (err as any).errors.forEach((e: any) => {
          if (e.path.length > 0) {
            newErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  return { validate, errors };
}
