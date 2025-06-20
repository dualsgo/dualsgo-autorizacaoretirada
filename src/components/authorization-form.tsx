
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
      pickupStore: undefined, 
      buyerSignature: '',
      buyerIdDocument: null,
      socialContractDocument: null,
    },
  });

  const buyerType = form.watch('buyerType');

  useEffect(() => {
    form.resetField('buyerRG');
    form.resetField('buyerCPF');
    form.resetField('buyerCNPJ');
    form.resetField('socialContractDocument');
    setSocialContractPreview(null);
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument']);
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    pdfContentElement.style.display = 'block';
    pdfContentElement.style.position = 'fixed';
    pdfContentElement.style.left = '-9999px'; 
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.width = '210mm'; 
    pdfContentElement.style.backgroundColor = '#ffffff';
    pdfContentElement.style.padding = '0';
    pdfContentElement.style.margin = '0';
    
    // Force reflow/repaint to ensure styles are applied
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;


    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 1, 
        useCORS: true,
        logging: false,
        width: pdfContentElement.scrollWidth,
        height: pdfContentElement.scrollHeight,
        windowWidth: pdfContentElement.scrollWidth,
        windowHeight: pdfContentElement.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;
      
      let imgRenderWidth = pdfWidth;
      let imgRenderHeight = pdfWidth / aspectRatio;

      // If rendered image height is greater than PDF height, scale down
      if (imgRenderHeight > pdfHeight) {
        imgRenderHeight = pdfHeight;
        imgRenderWidth = pdfHeight * aspectRatio;
      }
      
      // Center the image on the PDF page (optional, adjust as needed)
      const xOffset = (pdfWidth - imgRenderWidth) / 2;
      const yOffset = (pdfHeight - imgRenderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgRenderWidth, imgRenderHeight);
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
        setSignaturePreview(data.buyerSignature || null);
        setTimeout(resolve, 100); // Increased delay for complex DOM updates
      });
            
      await generatePdf();

    } catch (error) {
      console.error("Erro no processo de submissão:", error);
      toast({ title: "Erro na submissão", description: "Falha ao processar os dados para PDF.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getMunicipioUF = (cityStateString: string | undefined | null): { municipio: string; uf: string } => {
    if (!cityStateString) return { municipio: '', uf: '' };
    const parts = cityStateString.split('/');
    if (parts.length === 2) {
      return { municipio: parts[0].trim(), uf: parts[1].trim().toUpperCase() };
    }
    if (cityStateString.length > 2) {
      const ufCandidate = cityStateString.slice(-2).trim().toUpperCase();
      const municipioCandidate = cityStateString.slice(0, -2).trim();
      if (ufCandidate.length === 2 && /^[A-Z]{2}$/.test(ufCandidate) && municipioCandidate.length > 0) { 
         return { municipio: municipioCandidate, uf: ufCandidate };
      }
    }
    return { municipio: cityStateString.trim(), uf: '' }; 
  };


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
                <FormInput control={form.control} name="buyerCityState" label="Município / UF" placeholder="Cidade / ES" error={form.formState.errors.buyerCityState} />
              </CardContent>
            </Card>

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
                <FormInput control={form.control} name="representativeCityState" label="Município / UF" placeholder="Outra Cidade / RJ" error={form.formState.errors.representativeCityState} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="V12345678RIHP-01" error={form.formState.errors.orderNumber} />
                
                <FormFieldItem>
                    <Label htmlFor="pickupStore">Loja para Retirada</Label>
                    <Controller
                        control={form.control}
                        name="pickupStore"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <div className="md:col-span-2">
                    <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada" error={form.formState.errors.pickupDate} />
                </div>
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
                            description="Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB."
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
                                description="Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 5MB."
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
                      label="Assinatura do Comprador"
                      onSignatureChange={(dataUrl) => field.onChange(dataUrl)}
                      signatureError={form.formState.errors.buyerSignature?.message}
                      width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 450) : 450} 
                      height={150} 
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

      {/* Hidden PDF Template */}
      <div ref={pdfTemplateRef} className="hidden" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            .pdf-page-container {
              width: 100%;
              height: 100%;
              padding: 10mm; /* Standard A4 margin */
              box-sizing: border-box;
              font-size: 8pt; /* Base font size */
              line-height: 1.2;
              display: flex;
              flex-direction: column;
            }
            .pdf-header { text-align: center; margin-bottom: 5mm; }
            .pdf-logo { max-width: 120px; max-height: 40px; margin-bottom: 3mm; }
            .pdf-main-title { font-size: 10pt; font-weight: bold; margin-bottom: 5mm; text-transform: uppercase; }

            .pdf-section-box { border: 0.5px solid black; margin-bottom: 3mm; }
            .pdf-section-title-bar { background-color: #e0e0e0; padding: 0.5mm 1mm; font-weight: bold; font-size: 7pt; border-bottom: 0.5px solid black; }
            .pdf-section-content { padding: 1mm; }
            
            .pdf-info-grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 0.5mm 2mm; align-items: center; }
            .pdf-info-grid-full { display: grid; grid-template-columns: auto 1fr; gap: 0.5mm 2mm; align-items: center; }
            .pdf-info-label { font-weight: normal; font-size: 7pt; white-space: nowrap; }
            .pdf-info-value { font-size: 7pt; border-bottom: 0.25px dotted black; min-height: 3mm; display:flex; align-items:center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}
            
            .pdf-text-block { margin: 3mm 0; font-size: 7.5pt; text-align: justify; }
            .pdf-text-block p { margin-bottom: 1mm; }
            .pdf-text-block strong { font-weight: bold; }

            .pdf-order-table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
            .pdf-order-table th, .pdf-order-table td { border: 0.5px solid black; padding: 0.75mm; font-size: 7pt; text-align: left; vertical-align: middle; }
            .pdf-order-table th { font-weight: bold; background-color: #e0e0e0; }

            .pdf-footer-section { margin-top: 4mm; font-size: 7.5pt; }
            .pdf-signature-area { margin-top: 3mm; }
            .pdf-signature-label { margin-bottom: 0.5mm; display: block; }
            .pdf-signature-line-container { min-height: 12mm; display:flex; align-items: center; justify-content: flex-start; }
            .pdf-signature-line { width: 80mm; height: 12mm; border: 0.5px solid #ccc; display: flex; align-items: center; justify-content: center; }
            .pdf-signature-line img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .pdf-signature-placeholder { color: #888; font-size: 6.5pt; }
            
            .pdf-final-note { margin-top: auto; font-size: 6.5pt; text-align: left; padding-top: 2mm; }
            
            .pdf-document-section { margin-top: 3mm; page-break-inside: avoid; }
            .pdf-document-title { font-size: 7pt; font-weight: bold; margin-bottom: 1mm; text-align: center; }
            .pdf-document-image-container { display: flex; justify-content: center; align-items: center; border: 0.5px solid #ccc; min-height: 30mm; max-height: 40mm; padding: 1mm; margin-bottom:1mm; }
            .pdf-document-image-container img { max-width: 100%; max-height: 38mm; object-fit: contain; }
            .pdf-document-placeholder { font-size: 6.5pt; color: #666; text-align: center; }
          `}
        </style>
        <div className="pdf-page-container">
          <div className="pdf-header">
            <img src="https://placehold.co/120x40.png" alt="RIHAPPY Logo" className="pdf-logo" data-ai-hint="brand logo" />
            <div className="pdf-main-title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIROS</div>
          </div>

          {/* Comprador Section */}
          <div className="pdf-section-box">
            <div className="pdf-section-title-bar">COMPRADOR</div>
            <div className="pdf-section-content">
              <div className="pdf-info-grid-full" style={{ marginBottom: '0.5mm' }}>
                <div className="pdf-info-label">Nome/Razão Social:</div>
                <div className="pdf-info-value">{form.getValues('buyerName') || ''}</div>
              </div>
              <div className="pdf-info-grid">
                <div className="pdf-info-label">RG:</div>
                <div className="pdf-info-value">{form.getValues('buyerType') === 'individual' ? form.getValues('buyerRG') || '' : ''}</div>
                <div className="pdf-info-label" style={{paddingLeft: '2mm'}}>CPF:</div>
                <div className="pdf-info-value">{form.getValues('buyerType') === 'individual' ? form.getValues('buyerCPF') || '' : ''}</div>
              </div>
               {form.getValues('buyerType') === 'corporate' && (
                <div className="pdf-info-grid-full" style={{ marginTop: '0.5mm' }}>
                    <div className="pdf-info-label">CNPJ:</div>
                    <div className="pdf-info-value">{form.getValues('buyerCNPJ') || ''}</div>
                </div>
               )}
              <div className="pdf-info-grid-full" style={{ marginTop: '0.5mm' }}>
                <div className="pdf-info-label">Endereço:</div>
                <div className="pdf-info-value">{form.getValues('buyerAddress') || ''}</div>
              </div>
              <div className="pdf-info-grid">
                <div className="pdf-info-label">Município:</div>
                <div className="pdf-info-value">{getMunicipioUF(form.getValues('buyerCityState')).municipio}</div>
                <div className="pdf-info-label" style={{paddingLeft: '2mm'}}>UF:</div>
                <div className="pdf-info-value">{getMunicipioUF(form.getValues('buyerCityState')).uf}</div>
              </div>
            </div>
          </div>

          {/* Representante Section */}
          <div className="pdf-section-box">
            <div className="pdf-section-title-bar">REPRESENTANTE</div>
            <div className="pdf-section-content">
              <div className="pdf-info-grid-full" style={{ marginBottom: '0.5mm' }}>
                <div className="pdf-info-label">Nome/Razão Social:</div>
                <div className="pdf-info-value">{form.getValues('representativeName') || ''}</div>
              </div>
              <div className="pdf-info-grid">
                <div className="pdf-info-label">RG:</div>
                <div className="pdf-info-value">{form.getValues('representativeRG') || ''}</div>
                <div className="pdf-info-label" style={{paddingLeft: '2mm'}}>CPF:</div>
                <div className="pdf-info-value">{form.getValues('representativeCPF') || ''}</div>
              </div>
              <div className="pdf-info-grid-full" style={{ marginTop: '0.5mm' }}>
                <div className="pdf-info-label">Endereço:</div>
                <div className="pdf-info-value">{form.getValues('representativeAddress') || ''}</div>
              </div>
              <div className="pdf-info-grid">
                <div className="pdf-info-label">Município:</div>
                <div className="pdf-info-value">{getMunicipioUF(form.getValues('representativeCityState')).municipio}</div>
                <div className="pdf-info-label" style={{paddingLeft: '2mm'}}>UF:</div>
                <div className="pdf-info-value">{getMunicipioUF(form.getValues('representativeCityState')).uf}</div>
              </div>
            </div>
          </div>
          
          <div className="pdf-text-block">
            <p>O <strong>COMPRADOR</strong> autoriza seu <strong>REPRESENTANTE</strong>, acima identificado, a retirar os produtos listados no Pedido, cujas informações estão detalhadas no quadro abaixo, na loja física escolhida pelo <strong>COMPRADOR</strong> no momento da realização de sua compra no site.</p>
            <p>Para retirada dos produtos, o <strong>REPRESENTANTE</strong> deverá ser maior de 18 anos, estar munido de documento oficial com foto e deste termo devidamente assinado pelo <strong>COMPRADOR</strong> e uma cópia do documento de identidade oficial do <strong>COMPRADOR</strong>. Sendo o <strong>COMPRADOR</strong> pessoa jurídica, uma foto ou cópia autenticada do Contrato Social / Estatuto Social da empresa do <strong>COMPRADOR</strong> deverá ser apresentada. (*)</p>
            <p>O horário de funcionamento da loja física escolhida para retirada do pedido, deverá ser respeitado.</p>
          </div>

          <table className="pdf-order-table">
            <thead>
              <tr>
                <th>Data da Compra</th>
                <th>Valor da Compra</th>
                <th>Nº do Pedido</th>
                <th>Loja para Retirada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate')!, 'dd/MM/yyyy', { locale: ptBR }) : ''}</td>
                <td>R$ {form.getValues('purchaseValue') || ''}</td>
                <td>{form.getValues('orderNumber') || ''}</td>
                <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-footer-section">
            <div>Data da retirada: {form.getValues('pickupDate') ? format(form.getValues('pickupDate')!, 'dd / MM / yyyy', { locale: ptBR }) : '_____ / _____ / _____'}</div>
            
            <div className="pdf-signature-area">
              <span className="pdf-signature-label">Assinatura do comprador:</span>
              <div className="pdf-signature-line-container">
                <div className="pdf-signature-line">
                  {signaturePreview ? <img src={signaturePreview} alt="Assinatura do Comprador" /> : <span className="pdf-signature-placeholder"></span>}
                </div>
              </div>
              <span className="pdf-signature-label" style={{marginTop: '1mm'}}>Assinatura do comprador</span> {/* Redundant as per image */}
            </div>
          </div>
          
          {/* Document Images Section */}
          <div className="pdf-document-section">
            <div className="pdf-document-title">DOCUMENTO DE IDENTIDADE DO COMPRADOR</div>
            <div className="pdf-document-image-container">
              {buyerIdPreview ? <img src={buyerIdPreview} alt="Identidade do Comprador" /> : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
            </div>
          </div>

          {form.getValues('buyerType') === 'corporate' && socialContractPreview && (
            <div className="pdf-document-section">
              <div className="pdf-document-title">CONTRATO SOCIAL / ESTATUTO SOCIAL</div>
              <div className="pdf-document-image-container">
                {socialContractPreview.startsWith('data:image') ? 
                  <img src={socialContractPreview} alt="Contrato Social" /> : 
                  <p className="pdf-document-placeholder">Contrato Social (PDF) - Visualização não disponível.</p>
                }
              </div>
            </div>
          )}
          
          <div className="pdf-final-note">
            (*) Os documentos mencionados e obrigatórios para entrega do(s) produto(s), não serão retidos em loja, após a conferência, serão devolvidos ao terceiro autorizado.
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
              {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value as Date | undefined}
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
