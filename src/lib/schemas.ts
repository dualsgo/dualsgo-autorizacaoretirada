
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
  if (cleaned.length !== 11) return cpf; // Return original if not 11 digits for Zod to catch length error first if any
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
};

const isValidCPF = (cpf: string | undefined): boolean => {
  if (!cpf) return false;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  return true;
};

const formatRG = (rg: string | undefined): string | undefined => {
  if (!rg) return undefined;
  let cleaned = rg.replace(/\D/g, ''); 
  if (cleaned.length === 0) return rg; // Return original if empty after clean

  // Common RG patterns vary by state, this is a generic formatter
  // Assuming max 9 digits for simplicity in formatting, can be adjusted
  if (cleaned.length > 9) cleaned = cleaned.substring(0,9);


  if (cleaned.length === 9) { // e.g., XX.XXX.XXX-Y (São Paulo)
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})([\dX])$/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 8) { // e.g., X.XXX.XXX-Y or XX.XXX.XXX (depending on state)
     return cleaned.replace(/^(\d{1,2})(\d{3})(\d{3})([\dX])$/, '$1.$2.$3-$4'); // More flexible for 8-digit
  }
   // For RGs with fewer digits, just return cleaned or a partial format
  if (cleaned.length >= 7) {
    return cleaned.replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1.$2.$3');
  }
  return cleaned; 
};


const formatPhoneNumber = (phone: string | undefined): string | undefined => {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) { // DDD + 9 digits (mobile)
        return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    if (cleaned.length === 10) { // DDD + 8 digits (landline)
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone; // Return original if not matching expected lengths for Zod to catch
};

const nameValidationRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿĀ-žȘ-țА-яЁё\s']*$/;
// Corrected regex: Ș-ț includes Ș (U+0218), ș (U+0219), Ț (U+021A), ț (U+021B)

const rgValidationRegex = /^[0-9Xx]+$/; 


export const authorizationSchema = z.object({
  buyerType: z.enum(["individual", "corporate"], {
    required_error: "Selecione o tipo de comprador.",
  }),
  buyerName: z.string()
    .trim()
    .min(1, "Nome/Razão Social é obrigatório.")
    .regex(nameValidationRegex, "Nome/Razão Social contém caracteres inválidos.")
    .transform(val => capitalizeWords(val)),
  buyerRG: z.string()
    .trim()
    .optional()
    .transform(val => val ? val.replace(/[\.\-]/g, '') : undefined) 
    .refine(val => !val || rgValidationRegex.test(val), { message: "RG contém caracteres inválidos."})
    .refine(val => !val || (val.length >= 6 && val.length <= 9), { message: "RG deve ter entre 6 e 9 dígitos."})
    .transform(val => val ? formatRG(val) : undefined),
  buyerCPF: z.string()
    .trim()
    .optional()
    .refine(val => !val || isValidCPF(val), "CPF inválido.")
    .transform(val => val ? formatCPF(val) : undefined),
  buyerCNPJ: z.string().trim().optional()
    .transform(val => {
        if (!val) return undefined;
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length === 14) {
            return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        }
        return val; // Return original if not 14 digits for Zod to catch
    }).refine(val => {
        if (!val) return true; 
        const cleaned = val.replace(/\D/g, '');
        return cleaned.length === 14;
    }, "CNPJ deve ter 14 dígitos."),
  buyerEmail: z.string()
    .trim()
    .min(1, "E-mail do comprador é obrigatório.")
    .email("E-mail inválido. Verifique o formato (ex: nome@dominio.com).")
    .transform(val => val.toLowerCase()),
  buyerPhone: z.string()
    .trim()
    .min(1, "Telefone do comprador é obrigatório.")
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, "Telefone inválido. Use DDD + 8 ou 9 dígitos.")
    .transform(val => formatPhoneNumber(val)),
  
  representativeName: z.string()
    .trim()
    .min(1, "Nome do representante é obrigatório.")
    .regex(nameValidationRegex, "Nome do representante contém caracteres inválidos.")
    .transform(val => capitalizeWords(val)),
  representativeRG: z.string()
    .trim()
    .min(1, "RG do representante é obrigatório.")
    .transform(val => val.replace(/[\.\-]/g, ''))
    .refine(val => rgValidationRegex.test(val), { message: "RG do representante contém caracteres inválidos."})
    .refine(val => val.length >= 6 && val.length <= 9, { message: "RG do representante deve ter entre 6 e 9 caracteres."})
    .transform(val => formatRG(val)),
  representativeCPF: z.string()
    .trim()
    .min(1, "CPF do representante é obrigatório.")
    .refine(isValidCPF, "CPF do representante inválido.")
    .transform(formatCPF),

  purchaseDate: z.date({ required_error: "Data da compra é obrigatória." })
    .refine(date => {
        const today = new Date();
        today.setHours(0,0,0,0); 
        const purchaseD = new Date(date);
        purchaseD.setHours(0,0,0,0);
        return purchaseD <= today;
    }, "A data da compra não pode ser no futuro."),
  purchaseValue: z.string()
    .trim()
    .min(1, "Valor da compra é obrigatório.")
    .regex(/^[0-9]+([,.][0-9]{1,2})?$/, "Valor inválido. Use números e até 2 casas decimais (ex: 199,90 ou 199.90).")
    .transform(val => {
        const cleanedVal = val.replace(',', '.');
        const num = parseFloat(cleanedVal);
        return isNaN(num) ? "" : num.toFixed(2);
    }),
  orderNumber: z.string()
    .trim()
    .min(1, "Número do pedido é obrigatório.")
    .regex(/^V\d{8}RIHP-01$/, "Número do pedido inválido. Formato: V12345678RIHP-01.")
    .transform(val => val.toUpperCase()),
  pickupStore: z.enum([
      "1030 - NOVA AMÉRICA", "1033 - NORTESHOPPING", "1052 - BANGU", "1057 - IGUATEMI RJ",
      "1058 - VIA PARQUE", "1072 - GRANDE RIO", "1074 - NITERÓI PLAZA SHOP.", "1078 - ILHA PLAZA",
      "1101 - PARTEGE SÃO GONÇALO", "1106 - SHOPPING METROPOLITANO BARRA", "1141 - AMÉRICA SHOPPING",
      "1169 - NOVA IGUAÇU", "1187 - CARIOCA SHOPPING", "1224 - TOP SHOPPING", "1232 - BARRA SHOPPING",
      "1239 - SHOPPING RECREIO", "1300 - ECO VILLA", "1301 - IPANEMA", "1304 - PARK JACAREPAGUÁ",
      "9014 - RIO DESIGN"
    ] as const, { required_error: "Loja para retirada é obrigatória."}),

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
     const cleanedCnpj = data.buyerCNPJ ? data.buyerCNPJ.replace(/\D/g, '') : '';
    if (cleanedCnpj.length !== 14) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CNPJ deve ter 14 dígitos.",
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (data.purchaseDate) {
    const purchaseD = new Date(data.purchaseDate);
    purchaseD.setHours(0,0,0,0);
    if (purchaseD > today) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data da compra não pode ser no futuro.",
            path: ["purchaseDate"],
        });
    }
  }

  if (data.pickupDate) {
    const pickupD = new Date(data.pickupDate);
    pickupD.setHours(0, 0, 0, 0); 

    if (pickupD < today) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data da retirada não pode ser anterior à data atual.",
            path: ["pickupDate"],
        });
    }
    
    if (data.purchaseDate) {
        const purchaseD = new Date(data.purchaseDate);
        purchaseD.setHours(0,0,0,0);
        if (pickupD < purchaseD) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data da retirada não pode ser anterior à data da compra.",
                path: ["pickupDate"],
            });
        }
    }
  }
});

export type AuthorizationFormData = z.infer<typeof authorizationSchema>;

export const storeOptionsList = [
  "1030 - NOVA AMÉRICA", "1033 - NORTESHOPPING", "1052 - BANGU", "1057 - IGUATEMI RJ",
  "1058 - VIA PARQUE", "1072 - GRANDE RIO", "1074 - NITERÓI PLAZA SHOP.", "1078 - ILHA PLAZA",
  "1101 - PARTEGE SÃO GONÇALO", "1106 - SHOPPING METROPOLITANO BARRA", "1141 - AMÉRICA SHOPPING",
  "1169 - NOVA IGUAÇU", "1187 - CARIOCA SHOPPING", "1224 - TOP SHOPPING", "1232 - BARRA SHOPPING",
  "1239 - SHOPPING RECREIO", "1300 - ECO VILLA", "1301 - IPANEMA", "1304 - PARK JACAREPAGUÁ",
  "9014 - RIO DESIGN"
].map(store => ({ value: store, label: store }));

    