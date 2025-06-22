
import { z } from "zod";

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

const rgCnhValidationRegex = /^[a-zA-Z0-9]+$/;
const rgLengthMessage = "RG deve ter entre 6 e 9 caracteres alfanuméricos.";
const cnhLengthMessage = "CNH deve ter 11 dígitos numéricos.";


const formatPhoneNumber = (phone: string | undefined): string | undefined => {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
};

const nameValidationRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿĀ-žȘ-țА-яЁё\s']*$/;

export const documentTypeOptionsBuyer = [
  { value: "RG", label: "RG" },
  { value: "CNH", label: "CNH - Carteira de Motorista" },
];

export const documentTypeOptionsRepresentative = [
  { value: "RG", label: "RG" },
  { value: "CNH", label: "CNH - Carteira de Motorista" },
  { value: "CPF", label: "CPF" },
];

export const authorizationSchema = z.object({
  buyerType: z.enum(["individual", "corporate"], {
    required_error: "Selecione o tipo de comprador.",
  }),
  buyerName: z.string()
    .trim()
    .min(1, "Nome/Razão Social é obrigatório.")
    .regex(nameValidationRegex, "Nome/Razão Social contém caracteres inválidos.")
    .transform(val => capitalizeWords(val)),

  buyerCPF: z.string().optional()
    .transform(val => val ? val.replace(/\D/g, '') : undefined)
    .refine(val => !val || isValidCPF(val), "CPF do comprador inválido.")
    .transform(val => val ? formatCPF(val) : undefined),

  buyerDocumentType: z.enum(["RG", "CNH"], { errorMap: () => ({ message: "Selecione o tipo de documento do comprador (RG ou CNH)." })}).optional(),
  buyerDocumentNumber: z.string().trim().optional()
    .transform(val => val ? val.toUpperCase().replace(/[\.\-]/g, '') : undefined),

  buyerCNPJ: z.string().trim().optional()
    .transform(val => {
        if (!val) return undefined;
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length === 14) {
            return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        }
        return val;
    }),
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

  representativeDocumentType: z.enum(["RG", "CNH", "CPF"], {
    required_error: "Selecione o tipo de documento da pessoa autorizada.",
  }),
  representativeDocumentNumber: z.string()
    .trim()
    .min(1, "Número do documento da pessoa autorizada é obrigatório.")
    .transform(val => val ? val.toUpperCase().replace(/[\.\-]/g, '') : ''),

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

}).superRefine((data, ctx) => {
  // Buyer validation
  if (data.buyerType === "individual") {
    if (!data.buyerCPF) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF do comprador é obrigatório.", path: ["buyerCPF"] });
    }
    if (!data.buyerDocumentType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecione o tipo de documento do comprador (RG ou CNH).", path: ["buyerDocumentType"] });
    }
    if (!data.buyerDocumentNumber || data.buyerDocumentNumber.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número do documento do comprador é obrigatório.", path: ["buyerDocumentNumber"] });
    } else {
        if (data.buyerDocumentType === "RG") {
            if (!rgCnhValidationRegex.test(data.buyerDocumentNumber)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "RG do comprador contém caracteres inválidos.", path: ["buyerDocumentNumber"] });
            if (data.buyerDocumentNumber.length < 6 || data.buyerDocumentNumber.length > 9) ctx.addIssue({ code: z.ZodIssueCode.custom, message: rgLengthMessage, path: ["buyerDocumentNumber"] });
        } else if (data.buyerDocumentType === "CNH") {
            if (!/^\d{11}$/.test(data.buyerDocumentNumber)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: cnhLengthMessage, path: ["buyerDocumentNumber"] });
        }
    }
  } else if (data.buyerType === "corporate") {
    if (!data.buyerCNPJ || data.buyerCNPJ.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ do comprador é obrigatório.", path: ["buyerCNPJ"] });
    } else {
        const cleanedCnpj = data.buyerCNPJ.replace(/\D/g, '');
        if (cleanedCnpj.length !== 14) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ deve ter 14 dígitos.", path: ["buyerCNPJ"] });
        }
    }
  }

  // Representative document number validation based on type
  if (data.representativeDocumentType && data.representativeDocumentNumber) {
    const num = data.representativeDocumentNumber;
    if (data.representativeDocumentType === "RG") {
        if (!rgCnhValidationRegex.test(num)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "RG da pessoa autorizada contém caracteres inválidos.", path: ["representativeDocumentNumber"] });
        if (num.length < 6 || num.length > 9) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "RG da pessoa autorizada deve ter entre 6 e 9 caracteres.", path: ["representativeDocumentNumber"] });
    } else if (data.representativeDocumentType === "CNH") {
        if (!/^\d{11}$/.test(num)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNH da pessoa autorizada deve ter 11 dígitos.", path: ["representativeDocumentNumber"] });
    } else if (data.representativeDocumentType === "CPF") {
        if (!isValidCPF(num)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF da pessoa autorizada inválido.", path: ["representativeDocumentNumber"] });
        data.representativeDocumentNumber = formatCPF(num) || num;
    }
  }


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (data.purchaseDate) {
    const purchaseD = new Date(data.purchaseDate);
    purchaseD.setHours(0,0,0,0);
    if (purchaseD > today) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A data da compra não pode ser no futuro.", path: ["purchaseDate"] });
    }
  }

  if (data.pickupDate) {
    const pickupD = new Date(data.pickupDate);
    pickupD.setHours(0, 0, 0, 0);

    if (pickupD < today) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A data da retirada não pode ser anterior à data atual.", path: ["pickupDate"] });
    }

    if (data.purchaseDate) {
        const purchaseD = new Date(data.purchaseDate);
        purchaseD.setHours(0,0,0,0);
        if (pickupD < purchaseD) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A data da retirada não pode ser anterior à data da compra.", path: ["pickupDate"] });
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

    