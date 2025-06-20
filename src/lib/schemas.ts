
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

const formatCPF = (cpf: string | undefined): string | undefined => {
  if (!cpf) return undefined;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
};

const formatRG = (rg: string | undefined): string | undefined => {
  if (!rg) return undefined;
  const cleaned = rg.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})([0-9A-Za-z])$/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 8 && !isNaN(Number(cleaned.charAt(cleaned.length -1))) ) {
     return cleaned.replace(/^(\d{2})(\d{3})(\d{2})([0-9A-Za-z])$/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 7 && !isNaN(Number(cleaned.charAt(cleaned.length -1)))) {
    return cleaned.replace(/^(\d{1})(\d{3})(\d{2})([0-9A-Za-z])$/, '$1.$2.$3-$4');
  }
  if (cleaned.length > 4) {
    const firstPart = cleaned.slice(0, cleaned.length - 1);
    const lastChar = cleaned.slice(-1);
    if (firstPart.length > 3) {
        const p1 = firstPart.slice(0,2);
        const p2 = firstPart.slice(2,5);
        const p3 = firstPart.slice(5);
        return `${p1}.${p2}.${p3}-${lastChar}`;
    }
    return `${firstPart}-${lastChar}`;
  }
  return rg;
};

const formatPhoneNumber = (phone: string | undefined): string | undefined => {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) { // Celular (XX) XXXXX-XXXX
        return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    if (cleaned.length === 10) { // Fixo (XX) XXXX-XXXX
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone; // Retorna original se não se encaixar nos formatos comuns
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
  buyerRG: z.string().optional().transform(val => val ? formatRG(val.trim()) : undefined),
  buyerCPF: z.string().optional().transform(val => val ? formatCPF(val.trim()) : undefined),
  buyerCNPJ: z.string().optional().transform(val => val ? val.trim() : undefined),
  buyerEmail: z.string().email("E-mail inválido.").min(1, "E-mail do comprador é obrigatório.").transform(val => val.trim().toLowerCase()),
  buyerPhone: z.string().min(1, "Telefone do comprador é obrigatório.")
    .transform(val => val.trim())
    .refine(val => val.replace(/\D/g, '').length >= 10, "Telefone inválido. Deve conter DDD + número.")
    .transform(val => formatPhoneNumber(val)),
  
  representativeName: z.string().min(1, "Nome do representante é obrigatório.").transform(val => capitalizeWords(val.trim())),
  representativeRG: z.string().min(1, "RG do representante é obrigatório.").transform(val => formatRG(val.trim())),
  representativeCPF: z.string().min(1, "CPF do representante é obrigatório.").transform(val => formatCPF(val.trim())),

  purchaseDate: z.date({ required_error: "Data da compra é obrigatória." })
    .refine(date => {
        const today = new Date();
        today.setHours(0,0,0,0); // Compare dates only
        return date <= today;
    }, "A data da compra não pode ser no futuro."),
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
    const purchaseD = new Date(data.purchaseDate);
    const pickupD = new Date(data.pickupDate);
    purchaseD.setHours(0, 0, 0, 0); 
    pickupD.setHours(0, 0, 0, 0); 

    if (pickupD < purchaseD) { // Changed to strictly less than
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data da retirada não pode ser anterior à data da compra.",
        path: ["pickupDate"],
      });
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    if (pickupD < today) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data da retirada não pode ser anterior à data atual.",
            path: ["pickupDate"],
        });
    }
  }
});

export type AuthorizationFormData = z.infer<typeof authorizationSchema>;

export const storeOptionsList = storeOptions.map(store => ({ value: store, label: store }));

