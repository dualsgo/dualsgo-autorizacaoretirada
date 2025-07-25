
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, useWatch, type Control, type FieldError, type UseFormTrigger } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData, storeOptionsList, documentTypeOptionsBuyer, documentTypeOptionsRepresentative } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Users, ShoppingBag, AlertTriangle, HelpCircle, MessageSquareWarning, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';


// --- Formatting Utilities ---
const formatPhone = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

const formatCPF = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

const formatCNPJ = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const formatCurrency = (value: string) => {
    if (!value) return "";
    let cleaned = value.replace(/\D/g, '');
    if (!cleaned) return "";
    cleaned = (parseInt(cleaned, 10) / 100).toFixed(2);
    return cleaned.replace('.', ',');
};

const formatRG = (value: string) => {
    if (!value) return "";
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}


const InstructionGuide = () => (
    <Card className="mb-8 bg-primary/5">
        <CardHeader>
            <CardTitle className="font-headline text-lg">📝 Instruções de Preenchimento</CardTitle>
        </CardHeader>
        <CardContent>
            <ol className="space-y-4 text-sm text-foreground/90">
                <li className="flex items-start gap-3">
                    <span className="font-bold text-primary text-xl">1️⃣</span>
                    <div>
                        <strong>Dados da Compra e do Comprador:</strong>
                        <p className="mt-1">Preencha as informações exatamente como aparecem no e-mail de confirmação do pedido (aquele enviado após a aprovação do pagamento). Use o mesmo nome, CPF e e-mail informados na hora da compra, além do número do pedido, valor total e data da compra. Isso garante que a loja consiga localizar e validar seu pedido sem dificuldades.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <span className="font-bold text-primary text-xl">2️⃣</span>
                    <div>
                        <strong>Dados da Pessoa Autorizada:</strong>
                        <p className="mt-1">Informe os dados de quem irá retirar o pedido. Essa pessoa deve ser maior de idade e apresentar um documento oficial com foto no momento da retirada.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <span className="font-bold text-primary text-xl">3️⃣</span>
                     <div>
                        <strong>Gerar PDF:</strong>
                        <p className="mt-1">Depois de preencher todos os campos corretamente, clique em “Gerar PDF”. O arquivo será criado com os dados inseridos. Em seguida, envie esse PDF para o WhatsApp ou e-mail da loja responsável pela retirada.</p>
                    </div>
                </li>
            </ol>
        </CardContent>
    </Card>
);


export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGlobalError, setShowGlobalError] = useState(false);
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);


  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: 'individual',
      buyerName: '',
      buyerEmail: '',
      buyerPhone: '',
      buyerCPF: '',
      buyerDocumentType: undefined,
      buyerDocumentNumber: '',
      representativeName: '',
      representativeDocumentType: undefined,
      representativeDocumentNumber: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: undefined,
      agreedToTerms: false,
    },
     mode: "onChange",
  });

  const buyerType = form.watch('buyerType');
  const agreedToTerms = form.watch('agreedToTerms');
  const buyerDocType = useWatch({ control: form.control, name: 'buyerDocumentType' });
  const repDocType = useWatch({ control: form.control, name: 'representativeDocumentType' });
  const purchaseDate = form.watch('purchaseDate');
  const pickupDate = form.watch('pickupDate');


  useEffect(() => {
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
    } else {
        form.resetField('buyerCPF');
        form.resetField('buyerDocumentType');
        form.resetField('buyerDocumentNumber');
    }
    form.clearErrors();
  }, [buyerType, form]);

  useEffect(() => {
    if (purchaseDate && pickupDate) {
        const diffTime = new Date(pickupDate).getTime() - new Date(purchaseDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 15) {
            setShowDateWarningModal(true);
        }
    }
  }, [purchaseDate, pickupDate]);

  const getFullOrderNumber = () => {
    const orderNumberValue = form.getValues('orderNumber');
    return `V${orderNumberValue}RIHP-01`;
  };

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    pdfContentElement.style.display = 'flex';
    pdfContentElement.style.position = 'fixed';
    pdfContentElement.style.left = '-300mm'; // Off-screen
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.width = '210mm';
    pdfContentElement.style.height = 'auto';
    pdfContentElement.style.minHeight = '297mm';
    pdfContentElement.style.backgroundColor = '#FFFFFF';
    pdfContentElement.style.padding = '0';
    pdfContentElement.style.margin = '0';
    pdfContentElement.style.overflow = 'hidden';

    // Force reflow/repaint before capturing
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;


    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2, // Increase scale for better quality
        useCORS: true,
        logging: false, // Set to true for debugging if needed
        width: pdfContentElement.scrollWidth,
        height: pdfContentElement.scrollHeight,
        windowWidth: pdfContentElement.scrollWidth,
        windowHeight: pdfContentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4', true);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;

      let imgRenderWidth = pdfWidth;
      let imgRenderHeight = pdfWidth / aspectRatio;

      if (imgRenderHeight > pdfHeight) {
        imgRenderHeight = pdfHeight;
        imgRenderWidth = pdfHeight * aspectRatio;
      }
      
      const xOffset = (pdfWidth - imgRenderWidth) / 2;
      const yOffset = (pdfHeight - imgRenderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgRenderWidth, imgRenderHeight, undefined, 'FAST');
      pdf.save('autorizacao_retirada.pdf');
      toast({ variant: "success", title: "Sucesso!", description: "PDF gerado e download iniciado." });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", description: "Ocorreu um problema ao tentar gerar o documento.", variant: "destructive" });
    } finally {
       if (pdfContentElement) {
        pdfContentElement.style.display = 'none';
        pdfContentElement.style.position = 'absolute';
       }
    }
  };

  const handleGeneratePdf = async () => {
    setIsSubmitting(true);
    setShowGlobalError(false);

    try {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 50));
      });

      await generatePdf();

    } catch (error) {
      console.error("Erro no processo de submissão:", error);
      toast({ title: "Erro na submissão", description: "Falha ao processar os dados para PDF.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const onSubmit: SubmitHandler<AuthorizationFormData> = (_data) => {
    // The date difference warning is now handled by the useEffect hook.
    // We can proceed directly to PDF generation.
    handleGeneratePdf();
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      
       <Alert variant="warning" className="mb-8 text-foreground [&>svg]:text-foreground">
        <MessageSquareWarning className="h-5 w-5" />
        <ShadAlertTitle className="font-headline text-lg">Atenção aos Documentos!</ShadAlertTitle>
        <ShadAlertDescription className="space-y-2">
          <p>Para sua segurança, <strong>não solicitamos anexos de documentos</strong> através deste formulário.</p>
          <p>Será necessário enviar uma cópia digital (foto ou PDF) do <strong>documento com foto do comprador</strong> junto com este termo de autorização para o <strong>WhatsApp ou e-mail corporativo da loja</strong> no momento da retirada. Os colaboradores da loja fornecerão o contato correto.</p>
          <p>Certifique-se de que as cópias digitais estejam legíveis.</p>
        </ShadAlertDescription>
      </Alert>

      <InstructionGuide />

      <Card className="shadow-xl overflow-hidden">
        <CardContent className="p-6 space-y-8">
          <form 
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              setShowGlobalError(true);
              const firstErrorField = Object.keys(errors)[0] as keyof AuthorizationFormData;
              const element = document.querySelector(`[name="${firstErrorField}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            })}
            className="space-y-8"
          >

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Dados do Comprador</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldItem className="md:col-span-2">
                  <Label>Tipo de Comprador *</Label>
                  <Controller
                    control={form.control}
                    name="buyerType"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.trigger();
                        }}
                        defaultValue={field.value}
                        className="flex space-x-4 pt-2"
                      >
                        <FormItemRadio value="individual" label="Pessoa Física" field={field} />
                        <FormItemRadio value="corporate" label="Pessoa Jurídica" field={field} />
                      </RadioGroup>
                    )}
                  />
                  {form.formState.errors.buyerType && <FormErrorMessage message={form.formState.errors.buyerType.message} />}
                </FormFieldItem>

                <div className="md:col-span-2">
                  <FormInput control={form.control} name="buyerName" label="Nome Completo / Razão Social *" placeholder="João Silva / Empresa XYZ LTDA" error={form.formState.errors.buyerName} />
                </div>

                {buyerType === 'individual' && (
                  <>
                    <FormInput control={form.control} name="buyerCPF" label="CPF do Comprador *" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} inputMode="numeric" maxLength={14} formatter={formatCPF} tooltip="Digite apenas os números. A formatação é automática."/>
                    <FormSelect
                        control={form.control}
                        trigger={form.trigger}
                        name="buyerDocumentType"
                        label="Tipo de Documento com Foto *"
                        placeholder="Selecione RG ou CNH"
                        options={documentTypeOptionsBuyer}
                        error={form.formState.errors.buyerDocumentType}
                    />
                    <FormInput
                        control={form.control}
                        name="buyerDocumentNumber"
                        label={`Número do ${buyerDocType || 'Documento'} *`}
                        placeholder={!buyerDocType ? "Selecione o tipo primeiro" : (buyerDocType === 'CNH' ? '00000000000' : '00.000.000-0')}
                        error={form.formState.errors.buyerDocumentNumber}
                        inputMode={buyerDocType === 'CNH' ? 'numeric' : 'text'}
                        maxLength={buyerDocType === 'CNH' ? 11 : 12}
                        disabled={!buyerDocType}
                        formatter={buyerDocType === 'RG' ? formatRG : undefined}
                    />
                  </>
                )}
                {buyerType === 'corporate' && (
                  <>
                    <FormInput control={form.control} name="buyerCNPJ" label="CNPJ *" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} inputMode="numeric" className="md:col-span-2" maxLength={18} formatter={formatCNPJ} tooltip="Digite apenas os números. A formatação é automática." />
                  </>
                )}
                 <FormInput control={form.control} name="buyerEmail" label="E-mail do Comprador *" placeholder="comprador@exemplo.com" type="email" error={form.formState.errors.buyerEmail} />
                 <FormInput control={form.control} name="buyerPhone" label="Telefone do Comprador *" placeholder="(XX) XXXXX-XXXX" type="tel" error={form.formState.errors.buyerPhone} inputMode="tel" maxLength={15} formatter={formatPhone} tooltip="Digite apenas os números. A formatação é automática." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="text-primary" /> Dados da pessoa autorizada a retirar</CardTitle>
                <CardDescription>Essa pessoa precisa apresentar um documento original com foto na loja.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                 <FormInput control={form.control} name="representativeName" label="Nome Completo da Pessoa Autorizada *" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormSelect
                    control={form.control}
                    trigger={form.trigger}
                    name="representativeDocumentType"
                    label="Tipo de Documento da Pessoa Autorizada *"
                    placeholder="Selecione RG, CNH ou CPF"
                    options={documentTypeOptionsRepresentative}
                    error={form.formState.errors.representativeDocumentType}
                />
                <FormInput
                    control={form.control}
                    name="representativeDocumentNumber"
                    label={`Número do ${repDocType || 'Documento'} *`}
                    placeholder={!repDocType ? 'Selecione o tipo primeiro' : 'Digite o número'}
                    error={form.formState.errors.representativeDocumentNumber}
                    inputMode={repDocType === 'CPF' || repDocType === 'CNH' ? 'numeric' : 'text'}
                    maxLength={
                        repDocType === 'RG' ? 12 :
                        repDocType === 'CNH' ? 11 :
                        repDocType === 'CPF' ? 14 : 20
                    }
                    disabled={!repDocType}
                    formatter={
                        repDocType === 'CPF' ? formatCPF :
                        repDocType === 'RG' ? formatRG :
                        undefined
                    }
                    tooltip="Digite o número do documento. Para CPF, a formatação é automática."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra *" error={form.formState.errors.purchaseDate} />
                <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada *" error={form.formState.errors.pickupDate} />

                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$) *" placeholder="Ex: 199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} formatter={formatCurrency}/>
                
                <FormFieldItem>
                  <Label htmlFor="orderNumber">Número do Pedido *</Label>
                   <div className="flex items-center w-full">
                      <span className="inline-flex items-center px-3 h-10 text-sm text-foreground bg-muted border border-r-0 border-input rounded-l-md">
                          V
                      </span>
                      <Controller
                          control={form.control}
                          name="orderNumber"
                          render={({ field }) => (
                              <Input
                                  {...field}
                                  id="orderNumber"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="12345678"
                                  maxLength={8}
                                  className={cn(
                                      "rounded-none w-full min-w-0 flex-1 focus:ring-0 focus:z-10",
                                      form.formState.errors.orderNumber ? 'border-destructive' : ''
                                  )}
                                  onChange={(e) => {
                                      const { value } = e.target;
                                      // Allow only numbers
                                      if (/^\d*$/.test(value)) {
                                          field.onChange(value);
                                      }
                                  }}
                              />
                          )}
                      />
                      <span className="inline-flex items-center px-3 h-10 text-sm text-foreground bg-muted border border-l-0 border-input rounded-r-md whitespace-nowrap">
                          RIHP-01
                      </span>
                   </div>
                  {form.formState.errors.orderNumber && <FormErrorMessage message={form.formState.errors.orderNumber.message} />}
                </FormFieldItem>


                <FormFieldItem className="md:col-span-2">
                    <Label htmlFor="pickupStore">Loja para Retirada *</Label>
                    <Controller
                        control={form.control}
                        name="pickupStore"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger id="pickupStore" className={form.formState.errors.pickupStore ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Selecione uma loja" />
                            </SelectTrigger>
                            <SelectContent>
                            {storeOptionsList.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {form.formState.errors.pickupStore && <FormErrorMessage message={form.formState.errors.pickupStore.message} />}
                </FormFieldItem>
              </CardContent>
            </Card>

            <div className="mt-6 p-4 border rounded-md bg-background text-sm text-foreground space-y-3">
              <p className="font-semibold text-base">🔐 Tratamento de Dados Pessoais</p>
              <p>Os dados informados neste formulário serão utilizados exclusivamente para autorizar a retirada do pedido.</p>
              <p>Nenhuma informação será armazenada em servidores, nem compartilhada com terceiros para outras finalidades. Todo o conteúdo é usado apenas para gerar o documento em PDF no seu próprio dispositivo.</p>
              <p>Ao prosseguir, você declara estar ciente e concorda com o uso dos dados conforme descrito, em respeito à Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
            </div>

            <FormFieldItem>
                <div className="flex items-start space-x-3">
                     <Controller
                        name="agreedToTerms"
                        control={form.control}
                        render={({ field }) => (
                            <Checkbox
                                id="agreedToTerms"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-0.5"
                            />
                        )}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="agreedToTerms" className="cursor-pointer">
                          Li e concordo com o tratamento dos meus dados pessoais conforme descrito acima.
                        </Label>
                         <p className="text-xs text-muted-foreground">
                            (Obrigatório para gerar o PDF)
                         </p>
                    </div>
                </div>
                 {form.formState.errors.agreedToTerms && !agreedToTerms && <FormErrorMessage message={form.formState.errors.agreedToTerms.message} />}
            </FormFieldItem>

            <AlertDialog open={showGlobalError} onOpenChange={setShowGlobalError}>
              <AlertDialogContent className="bg-destructive text-destructive-foreground border-destructive-foreground/50">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Erro de Validação
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-destructive-foreground/90">
                    ❗ Verifique os campos obrigatórios acima e preencha todos corretamente para continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90">Fechar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showDateWarningModal} onOpenChange={setShowDateWarningModal}>
              <AlertDialogContent className="bg-warning text-warning-foreground border-warning-foreground/50">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Aviso de Prazo de Retirada
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-warning-foreground/90">
                     Atenção: A data de retirada informada está mais de 15 dias após a data da compra. Se o pedido tiver sido cancelado por inatividade, será necessário realizar uma nova compra. Recomendamos que você verifique o status do seu pedido antes de continuar o preenchimento deste documento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction className="bg-warning-foreground text-warning hover:bg-warning-foreground/90" onClick={() => setShowDateWarningModal(false)}>
                    Fechar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>


            <Button type="submit" size="lg" className="w-full font-headline bg-accent hover:bg-accent/90 text-accent-foreground text-lg" disabled={isSubmitting || !agreedToTerms}>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando PDF...
                </>
              ) : 'Gerar PDF e Baixar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div ref={pdfTemplateRef} className="hidden">
        <style>
          {`
      @page {
        size: A4;
        margin: 0;
      }
      body {
        margin: 0;
        color: #333333;
        font-family: 'Inter', Arial, sans-serif;
        background-color: #FFFFFF;
      }
      .pdf-page-container {
        width: 100%;
        min-height: 297mm;
        height: auto;
        padding: 10mm;
        box-sizing: border-box;
        font-size: 10pt;
        line-height: 1.4;
        background-color: #FFFFFF;
        color: #333333;
        display: flex;
        flex-direction: column;
        gap: 5mm;
      }

      .pdf-header {
        text-align: center;
        margin-bottom: 3mm;
      }
      .pdf-logo {
        max-width: 60px;
        height: auto;
        margin: 0 auto 1.5mm auto;
      }
      .pdf-main-title {
        font-size: 16pt;
        font-weight: 600;
        margin-bottom: 4mm;
        padding-bottom: 1.5mm;
        border-bottom: 1px solid #EEEEEE;
        color: #000000;
      }

      .pdf-section {
        margin-bottom: 0;
      }
      .pdf-section-title {
        font-size: 12pt;
        font-weight: 600;
        color: #333333;
        padding-bottom: 1mm;
        border-bottom: 1px solid #EEEEEE;
        margin-bottom: 2.5mm;
        display: flex;
        align-items: center;
        gap: 2mm;
      }

      .pdf-data-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2mm 5mm;
      }
      .pdf-data-item {
        display: flex;
        flex-direction: column;
      }
      .pdf-field-label {
        font-weight: 500;
        color: #555555;
        font-size: 8.5pt;
        margin-bottom: 0.5mm;
      }
      .pdf-field-value {
        padding: 2mm;
        background: #F8F9FA;
        border-radius: 2px;
        min-height: 5mm;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        word-break: break-all;
        font-size: 9.5pt;
      }

      .pdf-data-item.full-width {
        grid-column: span 2;
      }

      .pdf-notes {
        background: #FEFCE8; /* Light yellow */
        border-left: 2px solid #FACC15; /* Yellow accent */
        padding: 2.5mm;
        border-radius: 0 2px 2px 0;
        margin: 2.5mm 0;
        font-size: 8.5pt;
      }
      .pdf-note-item {
        display: block;
        margin-bottom: 1.5mm;
      }
      .pdf-note-item:last-child {
        margin-bottom: 0;
      }
      .pdf-note-item span {
        margin-right: 1.5mm;
      }
      .pdf-note-item strong {
        font-weight: 600;
      }

      .pdf-order-table {
        width: 100%;
        border-collapse: collapse;
        margin: 2.5mm 0;
        font-size: 9pt;
      }
      .pdf-order-table th, .pdf-order-table td {
        border: 1px solid #E5E7EB;
        padding: 1.5mm;
        text-align: left;
      }
      .pdf-order-table th {
        font-weight: 500;
        background-color: #F9FAFB;
      }

      .pdf-pickup-date {
        text-align: center;
        font-size: 10pt;
        padding: 2mm;
        background: #EFF6FF; /* Light blue */
        border: 1px solid #DBEAFE; /* Blue border */
        border-radius: 2px;
        margin: 2.5mm 0;
      }
      .pdf-pickup-date strong {
        font-weight: 600;
        color: #1D4ED8; /* Darker blue text */
      }
      
      .pdf-document-verification-note {
        margin-top: 5mm;
        padding: 3mm;
        background-color: #f0f8ff; /* Light blue background */
        border: 1px solid #a0d2eb; /* Primary blue border */
        border-radius: 3px;
        font-size: 9pt;
        text-align: center;
      }
      .pdf-document-verification-note strong {
        font-weight: 600;
      }

      .pdf-footer {
        font-size: 7.5pt;
        color: #6B7280;
        text-align: center;
        margin-top: auto;
        padding-top: 3mm;
        border-top: 1px solid #E5E7EB;
      }
    `}
        </style>

        <div className="pdf-page-container">
          <div className="pdf-header">
            <img src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png" alt="Logo Ri Happy" className="pdf-logo" data-ai-hint="company logo" />
            <div className="pdf-main-title">📝 Autorização para Retirada por Terceiros</div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">👤 Dados do Comprador</div>
            <div className="pdf-data-grid">
              <div className="pdf-data-item full-width">
                <span className="pdf-field-label">{form.getValues('buyerType') === 'individual' ? 'Nome Completo' : 'Razão Social'}</span>
                <div className="pdf-field-value">{form.getValues('buyerName') || ' '}</div>
              </div>

              {form.getValues('buyerType') === 'individual' ? (
                <>
                  <div className="pdf-data-item">
                    <span className="pdf-field-label">CPF</span>
                    <div className="pdf-field-value">{form.getValues('buyerCPF') || ' '}</div>
                  </div>
                  <div className="pdf-data-item">
                    <span className="pdf-field-label">Documento ({form.getValues('buyerDocumentType') || 'Não informado'})</span>
                    <div className="pdf-field-value">{form.getValues('buyerDocumentNumber') || ' '}</div>
                  </div>
                </>
              ) : (
                <div className="pdf-data-item full-width">
                  <span className="pdf-field-label">CNPJ</span>
                  <div className="pdf-field-value">{form.getValues('buyerCNPJ') || ' '}</div>
                </div>
              )}

              <div className="pdf-data-item">
                <span className="pdf-field-label">E-mail</span>
                <div className="pdf-field-value">{form.getValues('buyerEmail') || ' '}</div>
              </div>
              <div className="pdf-data-item">
                <span className="pdf-field-label">Telefone</span>
                <div className="pdf-field-value">{form.getValues('buyerPhone') || ' '}</div>
              </div>
            </div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">👥 Dados da Pessoa Autorizada</div>
            <div className="pdf-data-grid">
              <div className="pdf-data-item full-width">
                <span className="pdf-field-label">Nome Completo</span>
                <div className="pdf-field-value">{form.getValues('representativeName') || ' '}</div>
              </div>
              <div className="pdf-data-item full-width">
                <span className="pdf-field-label">Documento ({form.getValues('representativeDocumentType') || 'Não informado'})</span>
                <div className="pdf-field-value">{form.getValues('representativeDocumentNumber') || ' '}</div>
              </div>
            </div>
          </div>

           <div className="pdf-notes">
            <div className="pdf-note-item">
              <span>🔔</span>
              <strong>Envie este documento PDF</strong> para o WhatsApp ou e-mail da loja (fornecido no local) e aguarde a confirmação.
            </div>
            <div className="pdf-note-item">
                <span>📄</span>
                <strong>Documentos na Retirada:</strong> A pessoa autorizada deve apresentar seu documento original com foto e uma cópia (digital ou física) do documento com foto do comprador.
            </div>
            <div className="pdf-note-item">
              <span>⚠️</span>
              <strong>Atenção:</strong> A retirada deve ser feita dentro do horário de funcionamento da loja em até 15 dias. Após esse prazo, o pedido será cancelado e o pagamento estornado.
            </div>
            {form.getValues('buyerType') === 'corporate' && (
              <div className="pdf-note-item">
                <span>🏢</span>
                <strong>Para PJ:</strong> Adicionalmente, apresentar cópia do Contrato Social/Estatuto Social.
              </div>
            )}
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">🛒 Detalhes do Pedido</div>
            <table className="pdf-order-table">
              <thead>
                <tr>
                  <th>Data da Compra</th>
                  <th>Valor (R$)</th>
                  <th>Nº do Pedido</th>
                  <th>Loja de Retirada</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{form.getValues('purchaseDate') && form.getValues('purchaseDate') instanceof Date && !isNaN((form.getValues('purchaseDate') as Date).getTime()) ? format(form.getValues('purchaseDate') as Date, 'dd/MM/yyyy', { locale: ptBR }) : ' '}</td>
                  <td>{form.getValues('purchaseValue') ? parseFloat(form.getValues('purchaseValue').replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                  <td>{getFullOrderNumber()}</td>
                  <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ' '}</td>
                </tr>
              </tbody>
            </table>

            <div className="pdf-pickup-date">
              📅 <strong>Data prevista para retirada:</strong> {form.getValues('pickupDate') && form.getValues('pickupDate') instanceof Date && !isNaN((form.getValues('pickupDate') as Date).getTime()) ? format(form.getValues('pickupDate') as Date, 'dd/MM/yyyy', { locale: ptBR }) : '_____ / _____ / _____'}
            </div>
          </div>
          
          <div className="pdf-document-verification-note">
            <strong>Importante:</strong> Os documentos originais (do comprador e da pessoa autorizada) serão conferidos no ato da retirada. Prepare cópias digitais (fotos legíveis ou PDFs) para enviar à loja via WhatsApp/email, conforme orientação no local.
          </div>

          <div className="pdf-footer">
          * Os dados informados neste formulário são para uso exclusivo da autorização de retirada e não serão compartilhados.
          A Ri Happy Brinquedos S.A reserva-se o direito de não entregar o pedido caso haja divergência nas informações ou suspeita de fraude.
          </div>
        </div>
      </div>
    </div>
  );
}


// Helper components
const FormFieldItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("space-y-1", className)}>{children}</div>
);

interface FormInputProps {
  control: Control<AuthorizationFormData>;
  name: keyof AuthorizationFormData;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: FieldError;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  tooltip?: string;
  formatter?: (value: string) => string;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className, maxLength, disabled, tooltip, formatter }) => (
  <FormFieldItem className={className}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name as string}>{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
    </div>
    <Controller
      control={control}
      name={name}
      render={({ field }) => <Input 
        id={name as string} 
        type={type} 
        inputMode={inputMode} 
        placeholder={placeholder} 
        {...field} 
        onChange={(e) => {
            const value = e.target.value;
            field.onChange(formatter ? formatter(value) : value);
        }}
        value={field.value || ''} 
        maxLength={maxLength} 
        className={error ? 'border-destructive' : ''} 
        disabled={disabled}
      />}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormSelectProps {
    control: Control<AuthorizationFormData>;
    trigger: UseFormTrigger<AuthorizationFormData>;
    name: keyof AuthorizationFormData;
    label: string;
    placeholder: string;
    options: { value: string; label: string }[];
    error?: FieldError;
    className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ control, trigger, name, label, placeholder, options, error, className }) => (
    <FormFieldItem className={className}>
        <Label htmlFor={name}>{label}</Label>
        <Controller
            control={control}
            name={name}
            render={({ field }) => (
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (name === 'buyerDocumentType' || name === 'representativeDocumentType') {
                        const dependentField = (name === 'buyerDocumentType' ? 'buyerDocumentNumber' : 'representativeDocumentNumber') as keyof AuthorizationFormData;
                        trigger(dependentField);
                    }
                }}
                value={field.value || undefined}
                >
                    <SelectTrigger id={name} className={error ? 'border-destructive' : ''}>
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        />
        {error && <FormErrorMessage message={error.message} />}
    </FormFieldItem>
);


interface FormDatePickerProps {
  control: Control<AuthorizationFormData>;
  name: "purchaseDate" | "pickupDate";
  label: string;
  error?: FieldError;
}

const FormDatePicker: React.FC<FormDatePickerProps> = ({ control, name, label, error }) => (
  <FormFieldItem>
    <Label htmlFor={name}>{label}</Label>
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={name}
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.value && "text-muted-foreground",
                error ? 'border-destructive' : ''
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP", { locale: ptBR }) :
               field.value && typeof field.value === 'string' && !isNaN(new Date(field.value).getTime())? format(new Date(field.value), "PPP", { locale: ptBR }) :
               <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value ? (field.value instanceof Date ? field.value : new Date(field.value as string)) : undefined}
              onSelect={(date) => field.onChange(date)}
              initialFocus
              locale={ptBR}
              disabled={(date) => date < new Date("1900-01-01") || date > new Date("2100-01-01")}
            />
          </PopoverContent>
        </Popover>
      )}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

const FormItemRadio: React.FC<{ value: string; label: string; field: any }> = ({ value, label, field }) => (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={value} id={`${field.name}-${value}`} checked={field.value === value} />
    <Label htmlFor={`${field.name}-${value}`}>{label}</Label>
  </div>
);

const FormErrorMessage: React.FC<{ message?: string }> = ({ message }) => (
  message ? <p className="text-sm font-medium text-destructive">{message}</p> : null
);

export default AuthorizationForm;


    