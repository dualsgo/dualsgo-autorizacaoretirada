
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData, storeOptionsList } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader } from '@/components/file-uploader';
import { SignaturePad } from '@/components/signature-pad';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, User, Users, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [buyerIdPreview, setBuyerIdPreview] = useState<string | null>(null);
  const [socialContractPreview, setSocialContractPreview] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);


  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: 'individual',
      buyerName: '',
      buyerEmail: '', 
      buyerPhone: '',
      representativeName: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: undefined, 
      buyerSignature: '',
      buyerIdDocument: null,
      socialContractDocument: null,
    },
     mode: "onTouched", 
  });

  const buyerType = form.watch('buyerType');

  useEffect(() => {
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
        form.resetField('socialContractDocument');
        setSocialContractPreview(null);
    } else {
        form.resetField('buyerRG');
        form.resetField('buyerCPF');
    }
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument', 'buyerEmail', 'buyerPhone']);
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }
    
    pdfContentElement.style.display = 'flex'; // Changed to flex for main container
    pdfContentElement.style.position = 'fixed'; 
    pdfContentElement.style.left = '-300mm'; // Adjusted to ensure it's off-screen
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.width = '210mm'; 
    pdfContentElement.style.height = 'auto'; 
    pdfContentElement.style.minHeight = '297mm'; 
    pdfContentElement.style.backgroundColor = '#FFFFFF';
    pdfContentElement.style.padding = '0'; 
    pdfContentElement.style.margin = '0'; 
    pdfContentElement.style.overflow = 'hidden'; // Prevent scrollbars on the hidden element
    
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight; // Force reflow

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
    
    try {
      let buyerIdDataUrl: string | null = null;
      if (data.buyerIdDocument) {
        buyerIdDataUrl = await readFileAsDataURL(data.buyerIdDocument);
      }
  
      let socialContractDataUrl: string | null = null;
      if (data.socialContractDocument && data.buyerType === 'corporate') {
        socialContractDataUrl = await readFileAsDataURL(data.socialContractDocument);
      }
      
      await new Promise<void>(resolve => {
        setBuyerIdPreview(buyerIdDataUrl);
        setSocialContractPreview(socialContractDataUrl);
        setSignatureData(data.buyerSignature || null); // Ensure signatureData is set
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

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <CardDescription className="text-center text-primary-foreground/90 space-y-3 text-sm md:text-base">
            <p>Para garantir a segurança da sua compra, preencha o Termo de Autorização caso outra pessoa vá retirar seu pedido.</p>
            <p>Essa etapa é importante para proteger sua compra e garantir que tudo ocorra da forma mais segura possível 😉</p>
            <p className="font-semibold">Atenção: você tem até 15 dias para retirar o pedido na loja escolhida. Após esse prazo, o pedido será cancelado e o pagamento estornado automaticamente.</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
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
                            if (value === 'individual') {
                                form.trigger(['buyerRG', 'buyerCPF']);
                                form.setValue('buyerCNPJ', ''); 
                                form.setValue('socialContractDocument', null); 
                            } else {
                                form.trigger(['buyerCNPJ', 'socialContractDocument']);
                                form.setValue('buyerRG', ''); 
                                form.setValue('buyerCPF', ''); 
                            }
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
                  <FormInput control={form.control} name="buyerName" label="Nome / Razão Social" placeholder="João Silva / Empresa XYZ LTDA" error={form.formState.errors.buyerName} />
                </div>

                {buyerType === 'individual' && (
                  <>
                    <FormInput control={form.control} name="buyerRG" label="RG" placeholder="00.000.000-0 ou 0.000.000-X" error={form.formState.errors.buyerRG} inputMode="text" maxLength={12} />
                    <FormInput control={form.control} name="buyerCPF" label="CPF" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} inputMode="numeric" maxLength={14}/>
                  </>
                )}
                {buyerType === 'corporate' && (
                  <FormInput control={form.control} name="buyerCNPJ" label="CNPJ" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} inputMode="numeric" className="md:col-span-2" maxLength={18}/>
                )}
                 <FormInput control={form.control} name="buyerEmail" label="E-mail do Comprador" placeholder="comprador@email.com" type="email" error={form.formState.errors.buyerEmail} />
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
                 <FormInput control={form.control} name="representativeName" label="Nome Completo" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormInput control={form.control} name="representativeRG" label="RG" placeholder="11.111.111-1 ou 1.111.111-X" error={form.formState.errors.representativeRG} inputMode="text" maxLength={12}/>
                <FormInput control={form.control} name="representativeCPF" label="CPF" placeholder="111.111.111-11" error={form.formState.errors.representativeCPF} inputMode="numeric" maxLength={14}/>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada" error={form.formState.errors.pickupDate} />
                
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="V12345678RIHP-01" error={form.formState.errors.orderNumber} />
                
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
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><FileText className="text-primary" /> Documentos e Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Controller
                    control={form.control}
                    name="buyerIdDocument"
                    render={({ field: { onChange, value, ...restField }}) => (
                        <FileUploader
                            id="buyerIdDocument"
                            label="Identidade do Comprador (Frente e Verso)"
                            description="Documento de identidade é obrigatório. Formatos: JPG, PNG. Max: 5MB."
                            onFileChange={onChange}
                            accept="image/jpeg,image/png"
                            fileError={form.formState.errors.buyerIdDocument?.message as string | undefined}
                        />
                    )}
                />
                {buyerType === 'corporate' && (
                     <Controller
                        control={form.control}
                        name="socialContractDocument"
                        render={({ field: { onChange, value, ...restField } }) => (
                            <FileUploader
                                id="socialContractDocument"
                                label="Contrato Social / Estatuto Social Autenticado"
                                description="Contrato social é obrigatório para Pessoa Jurídica. Formatos: PDF, JPG, PNG. Max: 5MB."
                                onFileChange={onChange}
                                accept="application/pdf,image/jpeg,image/png"
                                fileError={form.formState.errors.socialContractDocument?.message as string | undefined}
                            />
                        )}
                    />
                )}
                 <Controller
                  control={form.control}
                  name="buyerSignature"
                  render={({ field }) => (
                    <SignaturePad
                      id="buyerSignature"
                      label="Assinatura do Comprador (Obrigatória)"
                      onSignatureChange={field.onChange} 
                      signatureError={form.formState.errors.buyerSignature?.message}
                    />
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full font-headline bg-accent hover:bg-accent/90 text-accent-foreground text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Gerando PDF...' : 'Gerar PDF e Baixar'}
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
        gap: 6mm; 
      }
      
      .pdf-header { 
        text-align: center; 
        margin-bottom: 4mm; 
      }
      .pdf-logo { 
        max-width: 70px; 
        height: auto;
        margin: 0 auto 2mm auto; 
      }
      .pdf-main-title { 
        font-size: 21pt; 
        font-weight: 600; 
        margin-bottom: 5mm; 
        padding-bottom: 2mm;
        border-bottom: 1px solid #EEEEEE; 
        color: #000000; 
      }
      
      .pdf-section {
        margin-bottom: 0; 
      }
      .pdf-section-title {
        font-size: 16pt; 
        font-weight: 600;
        color: #333333; 
        padding-bottom: 1.5mm;
        border-bottom: 1px solid #EEEEEE;
        margin-bottom: 3mm; 
        display: flex;
        align-items: center;
        gap: 2.5mm; 
      }
      
      .pdf-data-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr); 
        gap: 2.5mm 6mm; 
      }
      .pdf-data-item {
        display: flex;
        flex-direction: column; 
      }
      .pdf-field-label {
        font-weight: 500; 
        color: #666666;
        font-size: 10pt; 
        margin-bottom: 0.5mm;
      }
      .pdf-field-value {
        padding: 3mm;
        background: #F8F8F8; 
        border-radius: 3px;
        min-height: 7mm; 
        display: flex;
        align-items: center; 
        justify-content: flex-start; 
        word-break: break-all; 
      }
      
      .pdf-data-item.full-width {
        grid-column: span 2; 
      }
      
      .pdf-notes {
        background: #FFF9E6; 
        border-left: 2.5px solid #FFD700; 
        padding: 3mm;
        border-radius: 0 3px 3px 0; 
        margin: 4mm 0; 
      }
      .pdf-note-item {
        display: block; 
        margin-bottom: 2mm;
      }
      .pdf-note-item:last-child {
        margin-bottom: 0;
      }
      .pdf-note-item span { 
        margin-right: 2mm;
      }
      
      .pdf-order-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 3mm 0; 
        font-size: 10pt; 
      }
      .pdf-order-table th, .pdf-order-table td { 
        border: 1px solid #EEEEEE; 
        padding: 1.5mm; 
        text-align: left;
      }
      .pdf-order-table th {
        font-weight: 500;
        background-color: #FAFAFA; 
      }
      
      .pdf-pickup-date {
        text-align: center;
        font-size: 12.5pt; 
        padding: 2.5mm;
        background: #F0F8FF; 
        border-radius: 3px;
        margin: 3mm 0;
      }
      .pdf-pickup-date strong {
        font-weight: 600;
        color: #0066CC; 
      }
      
      .pdf-documents-section {
        display: flex; 
        gap: 6mm; 
        margin-top: 4mm;
      }
      .pdf-document-box { 
        flex: 3; 
        border: 1px dashed #CCCCCC;
        border-radius: 3px;
        padding: 2.5mm;
        display: flex;
        flex-direction: column;
        min-height: 50mm; 
      }
      .pdf-signature-box { 
        flex: 1; 
        border: 1px dashed #CCCCCC;
        border-radius: 3px;
        padding: 2.5mm;
        display: flex;
        flex-direction: column;
        min-height: 35mm; 
      }
      .pdf-doc-title {
        font-size: 11pt;
        font-weight: 500;
        margin-bottom: 2.5mm;
        text-align: center;
      }
      .pdf-doc-content { 
        flex: 1; 
        display: flex;
        align-items: center; 
        justify-content: center; 
        background: #FAFAFA; 
        border-radius: 3px;
        padding: 2.5mm;
      }
      .pdf-doc-placeholder {
        color: #999999;
        font-size: 10pt;
        text-align: center;
        padding: 4mm; 
        width: 100%;
      }
      .pdf-doc-content img {
        max-width: 95%; 
        max-height: 95%; 
        object-fit: contain; 
      }
      
      .pdf-corporate-doc {
        margin-top: 4mm; 
      }
      .pdf-corporate-doc-box {
        border: 1px dashed #CCCCCC;
        border-radius: 3px;
        padding: 2.5mm;
        display: flex;
        flex-direction: column;
        min-height: 45mm; 
      }
      
      .pdf-footer {
        font-size: 9pt; 
        color: #999999; 
        text-align: center;
        margin-top: auto; 
        padding-top: 4mm; 
        border-top: 1px solid #EEEEEE; 
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
                <span className="pdf-field-label">{form.getValues('buyerType') === 'individual' ? 'Nome' : 'Razão Social'}</span>
                <div className="pdf-field-value">{form.getValues('buyerName') || ' '}</div>
              </div>

              {form.getValues('buyerType') === 'individual' ? (
                <>
                  <div className="pdf-data-item">
                    <span className="pdf-field-label">CPF</span>
                    <div className="pdf-field-value">{form.getValues('buyerCPF') || ' '}</div>
                  </div>
                  <div className="pdf-data-item">
                    <span className="pdf-field-label">RG</span>
                    <div className="pdf-field-value">{form.getValues('buyerRG') || ' '}</div>
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
              <div className="pdf-data-item">
                <span className="pdf-field-label">CPF</span>
                <div className="pdf-field-value">{form.getValues('representativeCPF') || ' '}</div>
              </div>
              <div className="pdf-data-item">
                <span className="pdf-field-label">RG</span>
                <div className="pdf-field-value">{form.getValues('representativeRG') || ' '}</div>
              </div>
            </div>
          </div>

           <div className="pdf-notes">
            <div className="pdf-note-item">
              <span>🔔</span>
              <strong>Envie este documento</strong> para o WhatsApp ou e-mail da loja e aguarde a confirmação de recebimento. A pessoas autorizada a retirar deve ser maior de idade e apresentar um documento com foto.
            </div>
            <div className="pdf-note-item">
              <span>⚠️</span>
              <strong>Atenção:</strong> A retirada deve ser feita dentro do horário de funcionamento da loja em até 15 dias. após esse prazo, o pedido será cancelado e o pagamento estornado.
            </div>
            {form.getValues('buyerType') === 'corporate' && (
              <div className="pdf-note-item">
                <span>📄</span>
                <strong>Documento adicional:</strong> Para PJ, é necessário apresentar Contrato Social ou Estatuto Social.
              </div>
            )}
          </div>


          <div className="pdf-section">
            <div className="pdf-section-title">🛒 Detalhes do Pedido</div>
            <table className="pdf-order-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Nº do Pedido</th>
                  <th>Loja de Retirada</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{form.getValues('purchaseDate') && format(new Date(form.getValues('purchaseDate') as Date) , 'dd/MM/yyyy', { locale: ptBR }) || ' '}</td>
                  <td>R$ {form.getValues('purchaseValue') ? parseFloat(form.getValues('purchaseValue')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                  <td>{form.getValues('orderNumber') || ' '}</td>
                  <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ' '}</td>
                </tr>
              </tbody>
            </table>

            <div className="pdf-pickup-date">
              📅 <strong>Data prevista para retirada:</strong> {form.getValues('pickupDate') && format(new Date(form.getValues('pickupDate') as Date), 'dd/MM/yyyy', { locale: ptBR }) || '_____ / _____ / _____'}
            </div>
          </div>

          <div className="pdf-documents-section">
            <div className="pdf-document-box">
              <div className="pdf-doc-title">📄 Documento de Identidade</div>
              <div className="pdf-doc-content">
                {buyerIdPreview ? (
                  <img src={buyerIdPreview || ""} alt="Documento de Identidade" data-ai-hint="identity document" />
                ) : (
                  <div className="pdf-doc-placeholder">
                    Documento não fornecido<br />
                    <small>(Envie uma foto ou scan do documento)</small>
                  </div>
                )}
              </div>
            </div>

            <div className="pdf-signature-box">
              <div className="pdf-doc-title">✍️ Assinatura Digital</div>
              <div className="pdf-doc-content">
                {signatureData ? ( 
                  <img src={signatureData || ""} alt="Assinatura do Comprador" data-ai-hint="signature drawing" />
                ) : (
                  <div className="pdf-doc-placeholder">
                    Assinatura não fornecida<br />
                    <small>(Assine digitalmente este documento)</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {form.getValues('buyerType') === 'corporate' && (
            <div className="pdf-section pdf-corporate-doc">
              <div className="pdf-section-title">🏢 Documentos da Empresa</div>
              <div className="pdf-corporate-doc-box">
                <div className="pdf-doc-title">📑 Contrato Social / Estatuto Social</div>
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
            </div>
          )}

          <div className="pdf-footer">
          * Os documentos apresentados serão conferidos e devolvidos no ato da retirada do pedido. A Ri Happy Brinquedos S.A reserva-se o
          direito de não entregar o pedido caso haja divergência nas informações ou suspeita de fraude.
          </div>
        </div>
      </div>
    </div>
  );
}


// Helper components for cleaner form structure
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
