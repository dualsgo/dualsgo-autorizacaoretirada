
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
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
import { FileUploader } from '@/components/file-uploader';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, User, Users, ShoppingBag, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";


export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGlobalError, setShowGlobalError] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [buyerIdPreview, setBuyerIdPreview] = useState<string | null>(null);
  const [socialContractPreview, setSocialContractPreview] = useState<string | null>(null);
  const [representativeIdPreview, setRepresentativeIdPreview] = useState<string | null>(null);


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
      buyerIdDocument: null,
      socialContractDocument: null,
      representativeIdDocument: null,
    },
     mode: "onChange", 
  });

  const buyerType = form.watch('buyerType');
  const representativeDocType = form.watch('representativeDocumentType');

  useEffect(() => {
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
        form.resetField('socialContractDocument');
        setSocialContractPreview(null);
    } else {
        form.resetField('buyerCPF');
        form.resetField('buyerDocumentType');
        form.resetField('buyerDocumentNumber');
        form.resetField('buyerIdDocument');
        setBuyerIdPreview(null);
    }
    form.clearErrors();
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }
    
    pdfContentElement.style.display = 'flex'; 
    pdfContentElement.style.position = 'fixed'; 
    pdfContentElement.style.left = '-300mm'; 
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
      pdf.save('autorizacao_retirada.pdf');
      toast({ title: "Sucesso!", description: "PDF gerado e download iniciado." });

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

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit: SubmitHandler<AuthorizationFormData> = async (data) => {
    setIsSubmitting(true);
    setShowGlobalError(false);
    
    if (Object.keys(form.formState.errors).length > 0) {
        setShowGlobalError(true);
        setIsSubmitting(false);
        // Scroll to first error
        const firstErrorField = Object.keys(form.formState.errors)[0] as keyof AuthorizationFormData;
        const element = document.getElementsByName(firstErrorField)[0];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    try {
      let buyerIdDataUrl: string | null = null;
      if (data.buyerIdDocument && data.buyerType === 'individual') {
        buyerIdDataUrl = await readFileAsDataURL(data.buyerIdDocument);
      }
  
      let socialContractDataUrl: string | null = null;
      if (data.socialContractDocument && data.buyerType === 'corporate') {
        socialContractDataUrl = await readFileAsDataURL(data.socialContractDocument);
      }

      let representativeIdDataUrl: string | null = null;
      if (data.representativeIdDocument && (data.representativeDocumentType === 'RG' || data.representativeDocumentType === 'CNH')) {
        representativeIdDataUrl = await readFileAsDataURL(data.representativeIdDocument);
      }
      
      await new Promise<void>(resolve => {
        setBuyerIdPreview(buyerIdDataUrl);
        setSocialContractPreview(socialContractDataUrl);
        setRepresentativeIdPreview(representativeIdDataUrl);
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
  
  const buyerDocType = useWatch({ control: form.control, name: 'buyerDocumentType' });
  const repDocType = useWatch({ control: form.control, name: 'representativeDocumentType' });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Alert className="mb-8 bg-primary/10 border-primary/30 text-primary-foreground">
        <Info className="h-5 w-5 text-primary" />
        <ShadAlertTitle className="font-headline text-lg text-primary-foreground/90">Importante!</ShadAlertTitle>
        <ShadAlertDescription className="text-primary-foreground/80 space-y-1">
          <p>Para preencher os dados corretamente, acesse o e-mail de <strong>aprovação do pagamento</strong>. Nele você encontrará:</p>
          <ul className="list-disc list-inside pl-4">
            <li>Número do pedido</li>
            <li>Data da compra</li>
            <li>Valor da compra</li>
            <li>Loja de retirada</li>
          </ul>
          <p>Essas informações são essenciais para autorizarmos a retirada por outra pessoa.</p>
        </ShadAlertDescription>
      </Alert>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <CardDescription className="text-center text-primary-foreground/90 space-y-3 text-sm md:text-base">
            <p>Para garantir a segurança da sua compra, preencha o Termo de Autorização caso outra pessoa vá retirar seu pedido.</p>
            <p>Essa etapa é importante para proteger sua compra e garantir que tudo ocorra da forma mais segura possível 😉</p>
            <p className="font-semibold">Atenção: você tem até 15 dias para retirar o pedido na loja escolhida. Após esse prazo, o pedido será cancelado e o pagamento estornado automaticamente.</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit, () => setShowGlobalError(true))} className="space-y-8">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Dados do Comprador</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldItem className="md:col-span-2">
                  <Label>Tipo de Comprador</Label>
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
                  <FormInput control={form.control} name="buyerName" label="Nome Completo / Razão Social" placeholder="João Silva / Empresa XYZ LTDA" error={form.formState.errors.buyerName} />
                </div>

                {buyerType === 'individual' && (
                  <>
                    <FormInput control={form.control} name="buyerCPF" label="CPF do Comprador" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} inputMode="numeric" maxLength={14}/>
                    <FormSelect 
                        control={form.control} 
                        name="buyerDocumentType" 
                        label="Tipo de Documento com Foto" 
                        placeholder="Selecione RG ou CNH"
                        options={documentTypeOptionsBuyer}
                        error={form.formState.errors.buyerDocumentType}
                    />
                    <FormInput 
                        control={form.control} 
                        name="buyerDocumentNumber" 
                        label={`Número do ${buyerDocType === 'CNH' ? 'CNH' : 'RG'}`}
                        placeholder={buyerDocType === 'CNH' ? '00000000000' : '00.000.000-0'}
                        error={form.formState.errors.buyerDocumentNumber} 
                        inputMode={buyerDocType === 'CNH' ? 'numeric' : 'text'}
                        maxLength={buyerDocType === 'CNH' ? 11 : 12}
                    />
                     <Controller
                        control={form.control}
                        name="buyerIdDocument"
                        render={({ field: { onChange }}) => (
                            <FileUploader
                                id="buyerIdDocument"
                                label="Anexo do Documento com Foto do Comprador"
                                description="RG ou CNH (frente e verso legíveis). Formatos: JPG, PNG. Max: 5MB."
                                onFileChange={onChange}
                                accept="image/jpeg,image/png"
                                fileError={form.formState.errors.buyerIdDocument?.message as string | undefined}
                            />
                        )}
                    />
                  </>
                )}
                {buyerType === 'corporate' && (
                  <>
                    <FormInput control={form.control} name="buyerCNPJ" label="CNPJ" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} inputMode="numeric" className="md:col-span-2" maxLength={18}/>
                    <Controller
                        control={form.control}
                        name="socialContractDocument"
                        render={({ field: { onChange } }) => (
                            <FileUploader
                                id="socialContractDocument"
                                label="Contrato Social / Estatuto Social Autenticado"
                                description="Documento obrigatório para Pessoa Jurídica. Formatos: PDF, JPG, PNG. Max: 5MB."
                                onFileChange={onChange}
                                accept="application/pdf,image/jpeg,image/png"
                                fileError={form.formState.errors.socialContractDocument?.message as string | undefined}
                                className="md:col-span-2"
                            />
                        )}
                    />
                  </>
                )}
                 <FormInput control={form.control} name="buyerEmail" label="E-mail do Comprador" placeholder="comprador@exemplo.com" type="email" error={form.formState.errors.buyerEmail} />
                 <FormInput control={form.control} name="buyerPhone" label="Telefone do Comprador" placeholder="(XX) XXXXX-XXXX" type="tel" error={form.formState.errors.buyerPhone} inputMode="tel" maxLength={15}/>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="text-primary" /> Dados da pessoa autorizada a retirar</CardTitle>
                <CardDescription>Essa pessoa precisa apresentar o PDF desta autorização na loja.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                 <FormInput control={form.control} name="representativeName" label="Nome Completo da Pessoa Autorizada" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormSelect 
                    control={form.control} 
                    name="representativeDocumentType" 
                    label="Tipo de Documento da Pessoa Autorizada" 
                    placeholder="Selecione RG, CNH ou CPF"
                    options={documentTypeOptionsRepresentative}
                    error={form.formState.errors.representativeDocumentType}
                />
                <FormInput 
                    control={form.control} 
                    name="representativeDocumentNumber" 
                    label={`Número do ${repDocType || 'Documento'}`}
                    placeholder={
                        repDocType === 'RG' ? '00.000.000-0' : 
                        repDocType === 'CNH' ? '00000000000' : 
                        repDocType === 'CPF' ? '000.000.000-00' : 'Número do Documento'}
                    error={form.formState.errors.representativeDocumentNumber} 
                    inputMode={repDocType === 'CPF' || repDocType === 'CNH' ? 'numeric' : 'text'}
                    maxLength={
                        repDocType === 'RG' ? 12 : 
                        repDocType === 'CNH' ? 11 : 
                        repDocType === 'CPF' ? 14 : 20
                    }
                />
                {(representativeDocType === 'RG' || representativeDocType === 'CNH') && (
                    <Controller
                        control={form.control}
                        name="representativeIdDocument"
                        render={({ field: { onChange }}) => (
                            <FileUploader
                                id="representativeIdDocument"
                                label="Anexo do Documento com Foto da Pessoa Autorizada"
                                description="📎 Anexe um documento com foto da pessoa autorizada: Pode ser RG ou CNH. A imagem deve mostrar claramente a foto e as informações legíveis (nome, número do documento, validade, etc.). Anexos borrados, cortados ou sem foto não serão aceitos."
                                onFileChange={onChange}
                                accept="image/jpeg,image/png"
                                fileError={form.formState.errors.representativeIdDocument?.message as string | undefined}
                                className="md:col-span-2"
                            />
                        )}
                    />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada" error={form.formState.errors.pickupDate} />
                
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="Ex: 199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="Ex: V12345678RIHP-01" error={form.formState.errors.orderNumber} />
                
                <FormFieldItem className="md:col-span-2">
                    <Label htmlFor="pickupStore">Loja para Retirada</Label>
                    <Controller
                        control={form.control}
                        name="pickupStore"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
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
            
            {showGlobalError && Object.keys(form.formState.errors).length > 0 && (
                <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto max-w-md z-50">
                    <AlertTriangle className="h-4 w-4" />
                    <ShadAlertTitle>Erro de Validação</ShadAlertTitle>
                    <ShadAlertDescription>
                    ❗ Verifique os campos obrigatórios acima e preencha todos corretamente para continuar.
                    </ShadAlertDescription>
                </Alert>
            )}


            <Button type="submit" size="lg" className="w-full font-headline bg-accent hover:bg-accent/90 text-accent-foreground text-lg" disabled={isSubmitting}>
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
      
      {/* PDF Template - Hidden */}
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
        padding: 5mm; 
        box-sizing: border-box;
        font-size: 11.5pt; 
        line-height: 1.5; 
        background-color: #FFFFFF;
        color: #333333;
        display: flex;
        flex-direction: column;
        gap: 4mm; 
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
        font-size: 18pt; 
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
        font-size: 14pt; 
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
        font-size: 9.5pt; 
        margin-bottom: 0.5mm;
      }
      .pdf-field-value {
        padding: 2mm;
        background: #F8F9FA; 
        border-radius: 2px;
        min-height: 6mm; 
        display: flex;
        align-items: center; 
        justify-content: flex-start; 
        word-break: break-all; 
        font-size: 10.5pt;
      }
      
      .pdf-data-item.full-width {
        grid-column: span 2; 
      }
      
      .pdf-notes {
        background: #FEFCE8; /* Lighter yellow */
        border-left: 2px solid #FACC15; /* Amber */
        padding: 2.5mm;
        border-radius: 0 2px 2px 0; 
        margin: 3mm 0; 
        font-size: 9.5pt;
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
      
      .pdf-order-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 2.5mm 0; 
        font-size: 9.5pt; 
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
        font-size: 11pt; 
        padding: 2mm;
        background: #EFF6FF; /* Lighter blue */
        border: 1px solid #DBEAFE;
        border-radius: 2px;
        margin: 2.5mm 0;
      }
      .pdf-pickup-date strong {
        font-weight: 600;
        color: #1D4ED8; /* Darker blue */
      }
      
      .pdf-documents-grid { /* Changed from flex to grid for better control */
        display: grid;
        grid-template-columns: 1fr; /* Default to single column */
        gap: 3mm;
        margin-top: 3mm;
      }
      .pdf-documents-grid.two-columns { /* Class to apply when there are two document boxes */
        grid-template-columns: repeat(2, 1fr);
      }

      .pdf-document-box { 
        border: 1px dashed #D1D5DB;
        border-radius: 2px;
        padding: 2mm;
        display: flex;
        flex-direction: column;
        min-height: 40mm; 
      }
     
      .pdf-doc-title {
        font-size: 10pt;
        font-weight: 500;
        margin-bottom: 2mm;
        text-align: center;
        color: #374151;
      }
      .pdf-doc-content { 
        flex: 1; 
        display: flex;
        align-items: center; 
        justify-content: center; 
        background: #F9FAFB; 
        border-radius: 2px;
        padding: 2mm;
      }
      .pdf-doc-placeholder {
        color: #6B7280;
        font-size: 9pt;
        text-align: center;
        padding: 3mm; 
        width: 100%;
      }
      .pdf-doc-content img {
        max-width: 98%; 
        max-height: 98%; 
        object-fit: contain; 
      }
      
      .pdf-footer {
        font-size: 8pt; 
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

          {/* Buyer Data Section */}
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

          {/* Authorized Person Data Section */}
          <div className="pdf-section">
            <div className="pdf-section-title">👥 Dados da Pessoa Autorizada</div>
            <div className="pdf-data-grid">
              <div className="pdf-data-item full-width"> 
                <span className="pdf-field-label">Nome Completo</span>
                <div className="pdf-field-value">{form.getValues('representativeName') || ' '}</div>
              </div>
              <div className="pdf-data-item">
                <span className="pdf-field-label">Documento ({form.getValues('representativeDocumentType') || 'Não informado'})</span>
                <div className="pdf-field-value">{form.getValues('representativeDocumentNumber') || ' '}</div>
              </div>
            </div>
          </div>
          
          {/* Notes Section */}
           <div className="pdf-notes">
            <div className="pdf-note-item">
              <span>🔔</span>
              <strong>Envie este documento</strong> para o WhatsApp ou e-mail da loja e aguarde a confirmação de recebimento. A pessoa autorizada a retirar deve ser maior de idade e apresentar um documento com foto.
            </div>
            <div className="pdf-note-item">
              <span>⚠️</span>
              <strong>Atenção:</strong> A retirada deve ser feita dentro do horário de funcionamento da loja em até 15 dias. Após esse prazo, o pedido será cancelado e o pagamento estornado.
            </div>
            {form.getValues('buyerType') === 'corporate' && (
              <div className="pdf-note-item">
                <span>📄</span>
                <strong>Documento adicional:</strong> Para PJ, é necessário apresentar Contrato Social ou Estatuto Social.
              </div>
            )}
          </div>

          {/* Order Details Section */}
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
                  <td>{form.getValues('purchaseValue') ? parseFloat(form.getValues('purchaseValue')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                  <td>{form.getValues('orderNumber') || ' '}</td>
                  <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ' '}</td>
                </tr>
              </tbody>
            </table>

            <div className="pdf-pickup-date">
              📅 <strong>Data prevista para retirada:</strong> {form.getValues('pickupDate') && form.getValues('pickupDate') instanceof Date && !isNaN((form.getValues('pickupDate') as Date).getTime()) ? format(form.getValues('pickupDate') as Date, 'dd/MM/yyyy', { locale: ptBR }) : '_____ / _____ / _____'}
            </div>
          </div>
          
          {/* Documents Section */}
            <div className={`pdf-documents-grid ${
                (form.getValues('buyerType') === 'individual' && buyerIdPreview) || 
                (form.getValues('buyerType') === 'corporate' && socialContractPreview) ||
                ((form.getValues('representativeDocumentType') === 'RG' || form.getValues('representativeDocumentType') === 'CNH') && representativeIdPreview)
                 ? 'two-columns' : ''}`}>

                {form.getValues('buyerType') === 'individual' && (
                    <div className="pdf-document-box">
                        <div className="pdf-doc-title">📄 Documento do Comprador ({form.getValues('buyerDocumentType')})</div>
                        <div className="pdf-doc-content">
                            {buyerIdPreview ? (
                                <img src={buyerIdPreview || ""} alt="Documento do Comprador" data-ai-hint="identity document" />
                            ) : (
                                <div className="pdf-doc-placeholder">Documento não fornecido</div>
                            )}
                        </div>
                    </div>
                )}

                {form.getValues('buyerType') === 'corporate' && (
                    <div className="pdf-document-box">
                        <div className="pdf-doc-title">🏢 Contrato Social / Estatuto</div>
                        <div className="pdf-doc-content">
                        {socialContractPreview ? (
                            socialContractPreview.startsWith('data:image') ? 
                            <img src={socialContractPreview || ""} alt="Contrato Social" data-ai-hint="legal document" /> :
                            <div className="pdf-doc-placeholder">Documento PDF enviado</div> 
                        ) : (
                            <div className="pdf-doc-placeholder">Documento não fornecido</div>
                        )}
                        </div>
                    </div>
                )}
                
                {(form.getValues('representativeDocumentType') === 'RG' || form.getValues('representativeDocumentType') === 'CNH') && (
                     <div className="pdf-document-box">
                        <div className="pdf-doc-title">🆔 Documento da Pessoa Autorizada ({form.getValues('representativeDocumentType')})</div>
                        <div className="pdf-doc-content">
                            {representativeIdPreview ? (
                                <img src={representativeIdPreview || ""} alt="Documento da Pessoa Autorizada" data-ai-hint="identity document" />
                            ) : (
                                <div className="pdf-doc-placeholder">Documento não fornecido</div>
                            )}
                        </div>
                    </div>
                )}
            </div>


          <div className="pdf-footer">
          * Os documentos apresentados serão conferidos e devolvidos no ato da retirada do pedido. A Ri Happy Brinquedos S.A reserva-se o
          direito de não entregar o pedido caso haja divergência nas informações ou suspeita de fraude.
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
  control: any;
  name: keyof AuthorizationFormData | string; 
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: { message?: string };
  className?: string;
  maxLength?: number;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className, maxLength }) => (
  <FormFieldItem className={className}>
    <Label htmlFor={name as string}>{label}</Label>
    <Controller
      control={control}
      name={name as keyof AuthorizationFormData} 
      render={({ field }) => <Input id={name as string} type={type} inputMode={inputMode} placeholder={placeholder} {...field} value={field.value || ''} maxLength={maxLength} className={error ? 'border-destructive' : ''} />}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormSelectProps {
    control: any;
    name: keyof AuthorizationFormData;
    label: string;
    placeholder: string;
    options: { value: string; label: string }[];
    error?: { message?: string };
    className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ control, name, label, placeholder, options, error, className }) => (
    <FormFieldItem className={className}>
        <Label htmlFor={name}>{label}</Label>
        <Controller
            control={control}
            name={name}
            render={({ field }) => (
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    // Trigger validation for dependent fields if necessary, e.g., document number
                    if (name === 'buyerDocumentType' || name === 'representativeDocumentType') {
                        const dependentField = name === 'buyerDocumentType' ? 'buyerDocumentNumber' : 'representativeDocumentNumber';
                        (control as any).formContext.trigger(dependentField);
                    }
                }} 
                value={field.value || undefined} 
                defaultValue={field.value}
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
  control: any;
  name: "purchaseDate" | "pickupDate"; 
  label: string;
  error?: { message?: string };
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
  message ? <p className="text-sm text-destructive">{message}</p> : null
);

export default AuthorizationForm;
