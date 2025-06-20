
import { z } from "zod";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", ...ACCEPTED_IMAGE_TYPES];

const fileSchema = (acceptedTypes: string[], isRequired: boolean, requiredMessage: string) => z
  .custom<File | null>((file) => file instanceof File || file === null, "Arquivo inválido.")
  .refine((file) => !isRequired || file !== null, requiredMessage)
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
  buyerName: z.string().min(1, "Nome/Razão Social é obrigatório.").transform(val => capitalizeWords(val.trim())),
  buyerRG: z.string().optional().transform(val => val ? val.trim() : undefined),
  buyerCPF: z.string().optional().transform(val => val ? val.trim() : undefined),
  buyerCNPJ: z.string().optional().transform(val => val ? val.trim() : undefined),
  
  buyerStreet: z.string().min(1, "Rua é obrigatória.").transform(val => val.trim()),
  buyerNumber: z.string().min(1, "Número é obrigatório.").transform(val => val.trim()),
  buyerComplement: z.string().optional().transform(val => val ? val.trim() : undefined),
  buyerNeighborhood: z.string().min(1, "Bairro é obrigatório.").transform(val => val.trim()),
  buyerCity: z.string().min(1, "Município é obrigatório.").transform(val => val.trim()),
  buyerState: z.string().min(2, "UF é obrigatória e deve ter 2 caracteres.").max(2, "UF deve ter 2 caracteres.").transform(val => val.trim().toUpperCase()),

  representativeName: z.string().min(1, "Nome do representante é obrigatório.").transform(val => capitalizeWords(val.trim())),
  representativeRG: z.string().min(1, "RG do representante é obrigatório.").transform(val => val.trim()),
  representativeCPF: z.string().min(1, "CPF do representante é obrigatório.").transform(val => val.trim()),

  purchaseDate: z.date({ required_error: "Data da compra é obrigatória." }),
  purchaseValue: z.string().min(1, "Valor da compra é obrigatório.").transform(val => val.trim()),
  orderNumber: z.string()
    .min(1, "Número do pedido é obrigatório.")
    .regex(/^V\d{8}RIHP-01$/, "Número do pedido inválido. Formato esperado: V12345678RIHP-01.")
    .transform(val => val.trim().toUpperCase()),
  pickupStore: z.enum(storeOptions, { required_error: "Loja para retirada é obrigatória."}),

  pickupDate: z.date({ required_error: "Data da retirada é obrigatória." }),
  buyerSignature: z.string({required_error: "Assinatura do comprador é obrigatória."}).min(1, "Assinatura do comprador é obrigatória."),

  buyerIdDocument: fileSchema(ACCEPTED_IMAGE_TYPES, true, "Documento de identidade do comprador é obrigatório."),
  socialContractDocument: fileSchema(ACCEPTED_DOCUMENT_TYPES, false, "Contrato social é obrigatório para Pessoa Jurídica."),
}).superRefine((data, ctx) => {
  if (data.buyerType === "individual") {
    if (!data.buyerRG || data.buyerRG.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RG do comprador é obrigatório.",
        path: ["buyerRG"],
      });
    }
    if (!data.buyerCPF || data.buyerCPF.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF do comprador é obrigatório.",
        path: ["buyerCPF"],
      });
    }
  } else if (data.buyerType === "corporate") {
    if (!data.buyerCNPJ || data.buyerCNPJ.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ do comprador é obrigatório.",
        path: ["buyerCNPJ"],
      });
    }
    if (!data.socialContractDocument) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Contrato Social / Estatuto Social é obrigatório para Pessoa Jurídica.",
            path: ["socialContractDocument"],
        });
    }
  }

  if (data.purchaseDate && data.pickupDate) {
    const purchaseDate = new Date(data.purchaseDate);
    const pickupDate = new Date(data.pickupDate);
    purchaseDate.setHours(0, 0, 0, 0); // Normalize to start of day
    pickupDate.setHours(0, 0, 0, 0); // Normalize to start of day

    if (pickupDate <= purchaseDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data da retirada deve ser posterior à data da compra.",
        path: ["pickupDate"],
      });
    }
  }
});

export type AuthorizationFormData = z.infer<typeof authorizationSchema>;

export const storeOptionsList = storeOptions.map(store => ({ value: store, label: store }));
