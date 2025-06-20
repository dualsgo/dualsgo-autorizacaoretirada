
import { z } from "zod";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", ...ACCEPTED_IMAGE_TYPES];

const fileSchema = (acceptedTypes: string[]) => z
  .custom<File | null>((file) => file instanceof File || file === null, "Arquivo inválido.")
  .refine((file) => file === null || file.size <= MAX_FILE_SIZE_BYTES, `Tamanho máximo do arquivo é ${MAX_FILE_SIZE_MB}MB.`)
  .refine((file) => file === null || acceptedTypes.includes(file.type), "Formato de arquivo não suportado.");

const capitalizeWords = (str: string | undefined) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const storeOptions = [
  "1030 - NOVA AMÉRICA", "1033 - NORTESHOPPING", "1052 - BANGU", "1057 - IGUATEMI RJ",
  "1058 - VIA PARQUE", "1072 - GRANDE RIO", "1074 - NITERÓI PLAZA SHOP.", "1078 - ILHA PLAZA",
  "1101 - PARTEGE SÃO GONÇALO", "1106 - SHOPPING METROPOLITANO BARRA", "1141 - AMÉRICA SHOPPING",
  "1169 - NOVA IGUAÇU", "1187 - CARIOCA SHOPPING", "1224 - TOP SHOPPING", "1232 - BARRA SHOPPING",
  "1239 - SHOPPING RECREIO", "1300 - ECO VILLA", "1301 - IPANEMA", "1304 - PARK JACAREPAGUÁ",
  "9014 - RIO DESIGN"
] as const;

export const authorizationSchema = z.object({
  buyerType: z.enum(["individual", "corporate"], {
    required_error: "Selecione o tipo de comprador.",
  }),
  buyerName: z.string().min(3, "Nome/Razão Social deve ter pelo menos 3 caracteres.").transform(val => capitalizeWords(val.trim())),
  buyerRG: z.string().optional().transform(val => val ? val.trim() : val),
  buyerCPF: z.string().optional().transform(val => val ? val.trim() : val),
  buyerCNPJ: z.string().optional().transform(val => val ? val.trim() : val),
  buyerAddress: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres.").transform(val => val.trim()),
  buyerCityState: z.string().min(3, "Município/UF deve ter pelo menos 3 caracteres.").transform(val => val.trim()),

  representativeName: z.string().min(3, "Nome/Razão Social deve ter pelo menos 3 caracteres.").transform(val => capitalizeWords(val.trim())),
  representativeRG: z.string().min(5, "RG deve ter pelo menos 5 caracteres.").transform(val => val.trim()),
  representativeCPF: z.string().min(11, "CPF deve ter 11 caracteres.").max(14, "CPF deve ter no máximo 14 caracteres.").transform(val => val.trim()),
  representativeAddress: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres.").transform(val => val.trim()),
  representativeCityState: z.string().min(3, "Município/UF deve ter pelo menos 3 caracteres.").transform(val => val.trim()),

  purchaseDate: z.date({ required_error: "Data da compra é obrigatória." }),
  purchaseValue: z.string().min(1, "Valor da compra é obrigatório.").transform(val => val.trim()),
  orderNumber: z.string()
    .min(1, "Número do pedido é obrigatório.")
    .regex(/^RIHP-01\d{8}$/, "Número do pedido deve ser no formato RIHP-01 seguido por 8 números (ex: RIHP-0112345678).")
    .transform(val => val.trim().toUpperCase()),
  pickupStore: z.enum(storeOptions, { required_error: "Loja para retirada é obrigatória."}),

  pickupDate: z.date({ required_error: "Data da retirada é obrigatória." }),
  buyerSignature: z.string().optional(),

  buyerIdDocument: fileSchema(ACCEPTED_IMAGE_TYPES).refine(file => file !== null, "Documento de identidade é obrigatório."),
  socialContractDocument: fileSchema(ACCEPTED_DOCUMENT_TYPES).optional(),
}).superRefine((data, ctx) => {
  if (data.buyerType === "individual") {
    if (!data.buyerRG || data.buyerRG.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RG é obrigatório e deve ter pelo menos 5 caracteres.",
        path: ["buyerRG"],
      });
    }
    if (!data.buyerCPF || data.buyerCPF.trim().length < 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF é obrigatório e deve ter 11 caracteres.",
        path: ["buyerCPF"],
      });
    }
  } else if (data.buyerType === "corporate") {
    if (!data.buyerCNPJ || data.buyerCNPJ.trim().length < 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ é obrigatório e deve ter 14 caracteres.",
        path: ["buyerCNPJ"],
      });
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

export const storeOptionsList = storeOptions.map(store => ({ value: store, label: store }));
