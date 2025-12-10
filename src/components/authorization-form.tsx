
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
import { CalendarIcon, User, ShoppingBag, AlertTriangle, HelpCircle, Mail, Download, Lock, FileClock, ShieldCheck, FileWarning, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';
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


const InitialInstructions = () => (
    <div className="space-y-6 mb-8">
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <ShadAlertTitle className="font-headline text-lg text-primary">Por que isso é importante?</ShadAlertTitle>
            <ShadAlertDescription>
            Para garantir a segurança da sua compra, precisamos confirmar a autorização quando outra pessoa for retirar o pedido.
            </ShadAlertDescription>
        </Alert>
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-foreground">
            <FileClock className="h-5 w-5 text-primary" />
            <ShadAlertTitle className="font-headline text-lg text-primary">Prazo de retirada</ShadAlertTitle>
            <ShadAlertDescription>
            Você tem até <strong>15 dias</strong> para retirar o pedido. Após esse prazo, ele será <strong>cancelado automaticamente</strong> e o pagamento <strong>estornado</strong>.
            </ShadAlertDescription>
        </Alert>
        <Alert variant="warning" className="text-warning-foreground [&>svg]:text-warning-foreground bg-warning/20 border-warning">
            <FileWarning className="h-5 w-5" />
            <ShadAlertTitle className="font-headline text-lg">Atenção aos Documentos!</ShadAlertTitle>
            <ShadAlertDescription className="space-y-2">
                <p>Não solicitamos anexos de documentos neste formulário.</p>
                <p>A cópia digital (foto ou PDF) do documento do comprador deverá ser enviada <strong>junto com o PDF do termo</strong>, para o <strong>WhatsApp ou e-mail da loja</strong> no momento da retirada.</p>
                <p>As cópias devem estar <strong>legíveis</strong>.</p>
            </ShadAlertDescription>
        </Alert>
    </div>
);

export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGlobalError, setShowGlobalError] = useState(false);
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [showPostPdfModal, setShowPostPdfModal] = useState(false);
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
      pickupStore: '1187 - CARIOCA SHOPPING',
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

  const getPdfTitle = () => {
    const orderNumber = getFullOrderNumber();
    return `autorizacao_retirada_${orderNumber}.pdf`;
  };
  
  const getWhatsAppMessage = () => {
    const orderNumber = getFullOrderNumber();
    const message = `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${orderNumber}.`;
    return encodeURIComponent(message);
  };

  const getEmailBody = () => {
     const orderNumber = getFullOrderNumber();
     const message = `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${orderNumber}.`;
     return encodeURIComponent(message);
  };
  
  const getEmailSubject = () => {
    const orderId = getFullOrderNumber();
    return encodeURIComponent(`Envio do Termo de Autorização de Retirada - Pedido ${orderId}`);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;


    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2,
        useCORS: true,
        logging: false,
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
      
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], getPdfTitle(), { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Autorização Pedido ${getFullOrderNumber()}`,
          text: `Segue o termo de autorização para o pedido ${getFullOrderNumber()}.`,
        });
        toast({ variant: "success", title: "Pronto para Enviar!", description: "Selecione o WhatsApp ou E-mail para compartilhar o PDF." });
      } else {
        pdf.save(getPdfTitle());
        setShowPostPdfModal(true);
      }

    } catch (error) {
      console.error("Erro ao gerar ou compartilhar PDF:", error);
      // Fallback to download if sharing fails
      try {
        const pdf = new jsPDF('p', 'mm', 'a4', true); // Re-create to be safe
        // ... (re-add image logic here if needed, or just save blank for error)
        pdf.text("Ocorreu um erro ao gerar o PDF.", 10, 10);
        pdf.save(getPdfTitle());
        toast({ title: "Erro ao compartilhar", description: "O PDF foi baixado. Envie-o manualmente.", variant: "destructive" });
        setShowPostPdfModal(true);
      } catch (saveError) {
        console.error("Erro ao salvar PDF como fallback:", saveError);
        toast({ title: "Erro crítico", description: "Não foi possível gerar ou baixar o PDF.", variant: "destructive" });
      }
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
    handleGeneratePdf();
  };


  return (
    <div className="container mx-auto p-0 max-w-4xl">
      
       <InitialInstructions />

      <Card className="shadow-xl overflow-hidden mt-8">
        <CardHeader>
            <CardTitle className="font-headline text-2xl text-center">Formulário de Autorização</CardTitle>
        </CardHeader>
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
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-primary/20 text-primary rounded-full h-10 w-10 flex items-center justify-center font-bold text-xl">1</div>
                  <div>
                      <h3 className="font-headline font-semibold text-lg">Dados da Compra e do Comprador</h3>
                      <p className="mt-1 text-muted-foreground">Preencha <strong>exatamente</strong> como aparecem no e-mail de confirmação. Nome, CPF, e-mail, valor total e número do pedido.</p>
                  </div>
                </div>
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
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-primary/20 text-primary rounded-full h-10 w-10 flex items-center justify-center font-bold text-xl">2</div>
                  <div>
                      <h3 className="font-headline font-semibold text-lg">Dados da Pessoa Autorizada</h3>
                      <p className="mt-1 text-muted-foreground">Informe os dados da pessoa que fará a retirada. Ela deve ser <strong>maior de idade</strong> e apresentar <strong>documento original com foto</strong> na loja.</p>
                  </div>
                </div>
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
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-primary/20 text-primary rounded-full h-10 w-10 flex items-center justify-center font-bold text-xl">3</div>
                    <div>
                        <h3 className="font-headline font-semibold text-lg">Detalhes da Compra, Retirada e Geração do PDF</h3>
                        <p className="mt-1 text-muted-foreground">Após preencher tudo, clique em <strong>Gerar PDF</strong>. Em seguida, <strong>envie o PDF gerado + foto do seu documento de identificação</strong> para o WhatsApp ou e-mail da loja.</p>
                        <p className="mt-2 font-bold text-accent">Importante: Não envie prints. Envie o arquivo PDF completo.</p>
                    </div>
                </div>
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
                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled>
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
            
            <>
              <Alert variant="default" className="mt-6 p-4 border rounded-md text-sm text-foreground bg-primary/5">
                  <Lock className="h-5 w-5 text-primary"/>
                  <ShadAlertTitle className="font-semibold text-base text-primary">Tratamento de Dados Pessoais</ShadAlertTitle>
                  <ShadAlertDescription>
                    <p className="mt-2">Os dados informados neste formulário serão utilizados exclusivamente para autorizar a retirada do pedido.</p>
                    <p>Nenhuma informação será armazenada em servidores, nem compartilhada com terceiros para outras finalidades. Todo o conteúdo é usado apenas para gerar o documento em PDF no seu próprio dispositivo.</p>
                    <p>Ao prosseguir, você declara estar ciente e concorda com o uso dos dados conforme descrito, em respeito à Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
                  </ShadAlertDescription>
              </Alert>

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
            
              <Button type="submit" size="lg" className="w-full font-headline bg-primary hover:bg-primary/90 text-primary-foreground text-lg" disabled={isSubmitting || !agreedToTerms}>
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Gerar e Baixar PDF
                  </>
                )}
              </Button>
            </>
          </form>
          
          <AlertDialog open={showPostPdfModal} onOpenChange={setShowPostPdfModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center justify-center gap-2 font-headline text-xl text-center">
                  <ClipboardCheck className="h-8 w-8 text-primary" />
                  PDF Gerado! Próximo Passo:
                </AlertDialogTitle>
                <AlertDialogDescription className="text-foreground/90 pt-2 text-center space-y-3">
                  <p>O seu PDF foi baixado! Agora você precisa enviá-lo para a loja.</p>
                  <p>Acesse a área de downloads do seu navegador (geralmente clicando no ícone de <strong>seta para baixo ↓</strong> ou no menu de <strong>3 pontinhos ⋮</strong>) e abra o arquivo.</p>
                  <p>Dentro do visualizador de PDF, procure pela opção <strong>"Compartilhar"</strong> e envie o arquivo para a loja junto com uma foto do seu documento.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <a href={`https://api.whatsapp.com/send/?phone=5511992011112&text=${getWhatsAppMessage()}&type=phone_number&app_absent=0`} target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.38c1.45.79 3.08 1.21 4.7 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.05 20.2c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.81.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.41 0-4.54 3.7-8.23 8.24-8.23 2.22 0 4.28.86 5.82 2.41 1.55 1.54 2.41 3.6 2.41 5.82-.01 4.54-3.7 8.24-8.23 8.24zm4.52-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14 0-.3 0-.46 0-.16 0-.41.06-.62.31-.22.25-.83.81-.83 1.98 0 1.16.85 2.3 1.05 2.5.14.17 1.67 2.56 4.05 3.55.57.23 1.02.37 1.37.47.59.17 1.13.15 1.56.09.48-.06 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z"/></svg>
                    Enviar PDF e Foto do Documento por WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:loja187@rihappy.com.br?subject=${getEmailSubject()}&body=${getEmailBody()}`} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-5 w-5 mr-2" />
                    Enviar PDF e Foto do Documento por E-mail
                  </a>
                </Button>
                <AlertDialogCancel>Fechar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

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
        <AlertDialogContent className="bg-warning text-warning-foreground border-warning/50">
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
      
      .pdf-document-verification-note {
        margin-top: 5mm;
        padding: 3mm;
        background-color: #fff9c4;
        border: 1px solid #fbc02d;
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
            <div className="pdf-main-title">📝 Autorização para Retirada - Pedido {getFullOrderNumber()}</div>
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
          
           <div className="pdf-section">
                <div className="pdf-section-title">🛒 Detalhes da Compra e Retirada</div>
                 <div className="pdf-data-grid">
                    <div className="pdf-data-item">
                        <span className="pdf-field-label">Data da Compra</span>
                        <div className="pdf-field-value">{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate')!, 'dd/MM/yyyy') : ' '}</div>
                    </div>
                    <div className="pdf-data-item">
                        <span className="pdf-field-label">Valor Total</span>
                        <div className="pdf-field-value">R$ {form.getValues('purchaseValue') ? form.getValues('purchaseValue').replace('.', ',') : ' '}</div>
                    </div>
                    <div className="pdf-data-item">
                        <span className="pdf-field-label">Data da Retirada</span>
                        <div className="pdf-field-value">{form.getValues('pickupDate') ? format(form.getValues('pickupDate')!, 'dd/MM/yyyy') : ' '}</div>
                    </div>
                    <div className="pdf-data-item">
                        <span className="pdf-field-label">Loja de Retirada</span>
                        <div className="pdf-field-value">{form.getValues('pickupStore') || ' '}</div>
                    </div>
                </div>
           </div>

          <div className="pdf-document-verification-note">
            <strong>⚠️ Atenção:</strong> Este arquivo precisa ser enviado junto com a <strong>foto do documento do comprador</strong> para a validação da retirada.
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
        <Label htmlFor={name as string}>{label}</Label>
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
                    <SelectTrigger id={name as string} className={error ? 'border-destructive' : ''}>
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

    

    