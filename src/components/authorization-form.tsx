"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '@/components/file-uploader';
import { SignaturePad } from '@/components/signature-pad';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, User, Users, ShoppingBag, Truck, Edit3, Landmark, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [buyerIdPreview, setBuyerIdPreview] = useState<string | null>(null);
  const [socialContractPreview, setSocialContractPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);


  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: 'individual',
      buyerName: '',
      buyerRG: '',
      buyerCPF: '',
      buyerCNPJ: '',
      buyerAddress: '',
      buyerCityState: '',
      representativeName: '',
      representativeRG: '',
      representativeCPF: '',
      representativeAddress: '',
      representativeCityState: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: '',
      buyerSignature: '',
      buyerIdDocument: null,
      socialContractDocument: null,
    },
  });

  const buyerType = form.watch('buyerType');

  useEffect(() => {
    // Clear dependent fields when buyerType changes
    form.setValue('buyerRG', '');
    form.setValue('buyerCPF', '');
    form.setValue('buyerCNPJ', '');
    form.setValue('socialContractDocument', null);
    setSocialContractPreview(null);
    // Manually clear errors for these fields
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument']);
  }, [buyerType, form]);

  const generatePdf = async (data: AuthorizationFormData) => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    // Temporarily make it visible for rendering, but off-screen
    pdfContentElement.style.position = 'absolute';
    pdfContentElement.style.left = '-9999px';
    pdfContentElement.style.display = 'block';
    pdfContentElement.style.width = '210mm'; // A4 width

    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // For external images like placeholders
        logging: true, 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      const pageMargin = 10; // Margin for pages

      pdf.addImage(imgData, 'PNG', pageMargin, position + pageMargin, pdfWidth - (2*pageMargin), imgHeight - (2*pageMargin));
      heightLeft -= (pdfHeight - (2*pageMargin));

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', pageMargin, position - (2*pageMargin), pdfWidth - (2*pageMargin), imgHeight - (2*pageMargin));
        heightLeft -= (pdfHeight - (2*pageMargin));
      }
      
      pdf.save('autorizacao_retirada.pdf');
      toast({ title: "Sucesso!", description: "PDF gerado e download iniciado." });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", description: "Ocorreu um problema ao tentar gerar o documento.", variant: "destructive" });
    } finally {
      // Hide it again
       if (pdfContentElement) {
        pdfContentElement.style.display = 'none';
       }
    }
  };

  const onSubmit: SubmitHandler<AuthorizationFormData> = async (data) => {
    setIsSubmitting(true);

    // Process files for PDF template
    if (data.buyerIdDocument) {
        const reader = new FileReader();
        reader.onloadend = () => setBuyerIdPreview(reader.result as string);
        reader.readAsDataURL(data.buyerIdDocument);
    }
    if (data.socialContractDocument) {
        const reader = new FileReader();
        reader.onloadend = () => setSocialContractPreview(reader.result as string);
        reader.readAsDataURL(data.socialContractDocument);
    }
    setSignaturePreview(data.buyerSignature || null);
    
    // Wait for previews to update state (this is a common pattern, ideally use a callback or promise)
    // For simplicity, a short timeout is used here, but this is not robust.
    // A better approach would be to pass data directly to a PDF template component that handles rendering.
    setTimeout(async () => {
        await generatePdf(data);
        setIsSubmitting(false);
    }, 500); // Adjust timeout as needed, or refactor for robustness
  };
  
  const renderField = (label: string, value: string | undefined | null, fullWidth = false) => (
    <div className={cn("mb-2", fullWidth ? "col-span-2" : "")}>
      <p className="text-xs font-semibold text-gray-600">{label}:</p>
      <p className="text-sm text-gray-800 break-words">{value || 'Não informado'}</p>
    </div>
  );


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Card className="shadow-xl">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-3xl font-headline text-center text-primary-foreground">
            Autorização para Retirada por Terceiro
          </CardTitle>
          <CardDescription className="text-center text-primary-foreground/80">
            Preencha os dados abaixo para gerar sua autorização.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Seção Comprador */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Comprador</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldItem>
                  <Label>Tipo de Comprador</Label>
                  <Controller
                    control={form.control}
                    name="buyerType"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
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
                    <FormInput control={form.control} name="buyerRG" label="RG" placeholder="00.000.000-0" error={form.formState.errors.buyerRG} />
                    <FormInput control={form.control} name="buyerCPF" label="CPF" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} />
                  </>
                )}
                {buyerType === 'corporate' && (
                  <FormInput control={form.control} name="buyerCNPJ" label="CNPJ" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} />
                )}
                
                <FormInput control={form.control} name="buyerAddress" label="Endereço" placeholder="Rua Exemplo, 123, Bairro" error={form.formState.errors.buyerAddress} />
                <FormInput control={form.control} name="buyerCityState" label="Município / UF" placeholder="Cidade / UF" error={form.formState.errors.buyerCityState} />
              </CardContent>
            </Card>

            {/* Seção Representante */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="text-primary" /> Representante (Terceiro)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                 <FormInput control={form.control} name="representativeName" label="Nome / Razão Social" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormInput control={form.control} name="representativeRG" label="RG" placeholder="11.111.111-1" error={form.formState.errors.representativeRG} />
                <FormInput control={form.control} name="representativeCPF" label="CPF" placeholder="111.111.111-11" error={form.formState.errors.representativeCPF} />
                <FormInput control={form.control} name="representativeAddress" label="Endereço" placeholder="Av. Teste, 456" error={form.formState.errors.representativeAddress} />
                <FormInput control={form.control} name="representativeCityState" label="Município / UF" placeholder="Outra Cidade / UF" error={form.formState.errors.representativeCityState} />
              </CardContent>
            </Card>

            {/* Seção Detalhes da Compra */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="PED123456789" error={form.formState.errors.orderNumber} />
                <FormInput control={form.control} name="pickupStore" label="Loja para Retirada" placeholder="Ri Happy Shopping Central" error={form.formState.errors.pickupStore} />
              </CardContent>
            </Card>
            
            {/* Seção Retirada */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Truck className="text-primary" /> Retirada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormDatePicker control={form.control} name="pickupDate" label="Data da Retirada" error={form.formState.errors.pickupDate} />
                <Controller
                  control={form.control}
                  name="buyerSignature"
                  render={({ field }) => (
                    <SignaturePad
                      id="buyerSignature"
                      label="Assinatura do Comprador"
                      onSignatureChange={(dataUrl) => field.onChange(dataUrl)}
                      signatureError={form.formState.errors.buyerSignature?.message}
                      width={Math.min(window.innerWidth - 80, 500)} // Responsive width
                      height={200}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Seção Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><FileText className="text-primary" /> Documentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Controller
                    control={form.control}
                    name="buyerIdDocument"
                    render={({ field: { onChange, value, ...restField }}) => (
                        <FileUploader
                            id="buyerIdDocument"
                            label="Identidade do Comprador (Frente e Verso)"
                            description="Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB."
                            onFileChange={onChange}
                            accept="image/jpeg,image/png"
                            fileError={form.formState.errors.buyerIdDocument?.message}
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
                                label="Contrato Social (Opcional)"
                                description="Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 5MB."
                                onFileChange={onChange}
                                accept="application/pdf,image/jpeg,image/png"
                                fileError={form.formState.errors.socialContractDocument?.message}
                            />
                        )}
                    />
                )}
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full font-headline bg-accent hover:bg-accent/90 text-accent-foreground text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Gerando PDF...' : 'Gerar PDF e Baixar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Hidden PDF Template */}
      <div ref={pdfTemplateRef} className="hidden" style={{ fontFamily: "'PT Sans', sans-serif", color: '#333', fontSize: '10pt', lineHeight: '1.4' }}>
        <style>
          {`
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            .pdf-header { background-color: #A0D2EB !important; color: #1e3a5f !important; padding: 10mm; text-align: center; }
            .pdf-header h1 { font-family: 'Poppins', sans-serif; font-size: 18pt; margin: 0; }
            .pdf-section { margin-bottom: 8mm; padding: 5mm; border: 1px solid #ddd; border-radius: 4px; }
            .pdf-section-title { font-family: 'Poppins', sans-serif; font-size: 14pt; color: #A0D2EB; margin-bottom: 4mm; border-bottom: 1px solid #A0D2EB; padding-bottom: 2mm; }
            .pdf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
            .pdf-field p:first-child { font-weight: bold; margin-bottom: 0.5mm; font-size: 9pt; color: #555; }
            .pdf-field p:last-child { margin-top: 0; font-size: 10pt; }
            .pdf-image-container { text-align: center; margin-top: 5mm; }
            .pdf-image-container img { max-width: 100%; height: auto; max-height: 100mm; border: 1px solid #ccc; padding: 2mm; }
            .pdf-footer-text { font-size: 8pt; color: #666; margin-top: 10mm; text-align: center; border-top: 1px solid #eee; padding-top: 5mm; }
          `}
        </style>
        <div style={{ padding: '10mm', width: '190mm', margin: '0 auto', backgroundColor: '#fff' }}>
          <div className="pdf-header" style={{ backgroundColor: '#A0D2EB', color: '#1e3a5f', padding: '10mm', textAlign: 'center' }}>
            <Image src="https://placehold.co/150x50.png?text=Logo+Ri+Happy" alt="Logo Ri Happy" width={150} height={50} data-ai-hint="company logo" style={{margin: '0 auto 5mm auto'}}/>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '18pt', margin: '0' }}>AUTORIZAÇÃO PARA RETIRADA POR TERCEIRO</h1>
          </div>

          <div className="pdf-section" style={{ marginTop: '10mm'}}>
            <h2 className="pdf-section-title">COMPRADOR</h2>
            <div className="pdf-grid">
              {renderField("Tipo", form.getValues('buyerType') === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica')}
              {renderField("Nome/Razão Social", form.getValues('buyerName'))}
              {form.getValues('buyerType') === 'individual' ? (
                <>
                  {renderField("RG", form.getValues('buyerRG'))}
                  {renderField("CPF", form.getValues('buyerCPF'))}
                </>
              ) : (
                renderField("CNPJ", form.getValues('buyerCNPJ'))
              )}
              {renderField("Endereço", form.getValues('buyerAddress'))}
              {renderField("Município/UF", form.getValues('buyerCityState'))}
            </div>
          </div>

          <div className="pdf-section">
            <h2 className="pdf-section-title">REPRESENTANTE (TERCEIRO)</h2>
            <div className="pdf-grid">
              {renderField("Nome/Razão Social", form.getValues('representativeName'))}
              {renderField("RG", form.getValues('representativeRG'))}
              {renderField("CPF", form.getValues('representativeCPF'))}
              {renderField("Endereço", form.getValues('representativeAddress'))}
              {renderField("Município/UF", form.getValues('representativeCityState'))}
            </div>
          </div>

          <div className="pdf-section">
            <h2 className="pdf-section-title">DETALHES DA COMPRA</h2>
            <div className="pdf-grid">
              {renderField("Data da Compra", form.getValues('purchaseDate') ? format(form.getValues('purchaseDate'), 'dd/MM/yyyy', { locale: ptBR }) : '')}
              {renderField("Valor da Compra", `R$ ${form.getValues('purchaseValue')}`)}
              {renderField("Número do Pedido", form.getValues('orderNumber'))}
              {renderField("Loja para Retirada", form.getValues('pickupStore'))}
            </div>
          </div>
          
          <div className="pdf-section">
            <h2 className="pdf-section-title">DOCUMENTO DE IDENTIDADE DO COMPRADOR</h2>
            <div className="pdf-image-container">
              {buyerIdPreview ? <img src={buyerIdPreview} alt="Identidade do Comprador" /> : <p>Documento não fornecido ou erro ao carregar.</p>}
            </div>
          </div>

          {form.getValues('buyerType') === 'corporate' && socialContractPreview && (
            <div className="pdf-section">
              <h2 className="pdf-section-title">CONTRATO SOCIAL</h2>
              <div className="pdf-image-container">
                {socialContractPreview.startsWith('data:image') ? <img src={socialContractPreview} alt="Contrato Social" /> : <p>Contrato Social (PDF/outro) anexado.</p>}
              </div>
            </div>
          )}
          
          <div className="pdf-section">
            <h2 className="pdf-section-title">RETIRADA E ASSINATURA</h2>
             <div className="pdf-grid">
                {renderField("Data da Retirada", form.getValues('pickupDate') ? format(form.getValues('pickupDate'), 'dd/MM/yyyy', { locale: ptBR }) : '')}
             </div>
            <p style={{marginTop: '5mm', fontWeight: 'bold'}}>Assinatura do Comprador:</p>
            <div className="pdf-image-container" style={{backgroundColor: '#f8f8f8', border: '1px dashed #ccc'}}>
              {signaturePreview ? <img src={signaturePreview} alt="Assinatura do Comprador" style={{maxWidth: '120mm', maxHeight: '40mm', border: 'none', padding: 0}} /> : <p>Assinatura não fornecida.</p>}
            </div>
          </div>

          <div className="pdf-footer-text">
            Os documentos mencionados são obrigatórios para entrega do(s) produto(s). Não serão retidos em loja. Após a conferência, serão devolvidos ao terceiro autorizado.
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
  name: keyof AuthorizationFormData;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal" | undefined;
  error?: { message?: string };
  className?: string;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className }) => (
  <FormFieldItem className={className}>
    <Label htmlFor={name}>{label}</Label>
    <Controller
      control={control}
      name={name}
      render={({ field }) => <Input id={name} type={type} inputMode={inputMode} placeholder={placeholder} {...field} value={field.value || ''} className={error ? 'border-destructive' : ''} />}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormDatePickerProps {
  control: any;
  name: "purchaseDate" | "pickupDate"; // Ensure name is one of the date fields
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
              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
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
  <p className="text-sm text-destructive">{message}</p>
);

export default AuthorizationForm;
