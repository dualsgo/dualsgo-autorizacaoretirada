import { z } from "zod";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", ...ACCEPTED_IMAGE_TYPES];

const fileSchema = (acceptedTypes: string[]) => z
  .custom<File | null>((file) => file instanceof File || file === null, "Arquivo inválido.")
  .refine((file) => file === null || file.size <= MAX_FILE_SIZE_BYTES, `Tamanho máximo do arquivo é ${MAX_FILE_SIZE_MB}MB.`)
  .refine((file) => file === null || acceptedTypes.includes(file.type), "Formato de arquivo não suportado.");

export const authorizationSchema = z.object({
  buyerType: z.enum(["individual", "corporate"], {
    required_error: "Selecione o tipo de comprador.",
  }),
  buyerName: z.string().min(3, "Nome/Razão Social deve ter pelo menos 3 caracteres."),
  buyerRG: z.string().optional(),
  buyerCPF: z.string().optional(),
  buyerCNPJ: z.string().optional(),
  buyerAddress: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres."),
  buyerCityState: z.string().min(3, "Município/UF deve ter pelo menos 3 caracteres."),

  representativeName: z.string().min(3, "Nome/Razão Social deve ter pelo menos 3 caracteres."),
  representativeRG: z.string().min(5, "RG deve ter pelo menos 5 caracteres."),
  representativeCPF: z.string().min(11, "CPF deve ter 11 caracteres.").max(14, "CPF deve ter no máximo 14 caracteres."),
  representativeAddress: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres."),
  representativeCityState: z.string().min(3, "Município/UF deve ter pelo menos 3 caracteres."),

  purchaseDate: z.date({ required_error: "Data da compra é obrigatória." }),
  purchaseValue: z.string().min(1, "Valor da compra é obrigatório."),
  orderNumber: z.string().min(1, "Número do pedido é obrigatório."),
  pickupStore: z.string().min(3, "Loja para retirada é obrigatória."),

  pickupDate: z.date({ required_error: "Data da retirada é obrigatória." }),
  buyerSignature: z.string().optional(), // Data URL of the signature image

  buyerIdDocument: fileSchema(ACCEPTED_IMAGE_TYPES).refine(file => file !== null, "Documento de identidade é obrigatório."),
  socialContractDocument: fileSchema(ACCEPTED_DOCUMENT_TYPES).optional(),
}).superRefine((data, ctx) => {
  if (data.buyerType === "individual") {
    if (!data.buyerRG || data.buyerRG.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RG é obrigatório e deve ter pelo menos 5 caracteres.",
        path: ["buyerRG"],
      });
    }
    if (!data.buyerCPF || data.buyerCPF.length < 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF é obrigatório e deve ter 11 caracteres.",
        path: ["buyerCPF"],
      });
    }
  } else if (data.buyerType === "corporate") {
    if (!data.buyerCNPJ || data.buyerCNPJ.length < 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ é obrigatório e deve ter 14 caracteres.",
        path: ["buyerCNPJ"],
      });
    }
    if (!data.socialContractDocument) {
       // Optional for now as per prompt, but could be made mandatory
    }
  }

  if (!data.buyerSignature || data.buyerSignature.length === 0) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assinatura do comprador é obrigatória.",
        path: ["buyerSignature"],
      });
  }
});

export type AuthorizationFormData = z.infer<typeof authorizationSchema>;
