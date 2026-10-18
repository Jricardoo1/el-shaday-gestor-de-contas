import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Save,
  MessageSquare,
  Sparkles,
  Users,
  Search,
  ExternalLink,
  Bot,
  CalendarHeart,
  Calendar,
  Filter,
} from 'lucide-react';
import { Customer, StoreSettings } from '../types';

interface WhatsAppBroadcastModalProps {
  customers: Customer[];
  settings: StoreSettings;
  onClose: () => void;
}

const STORAGE_KEY = 'fiado_app_whatsapp_broadcast_msg_v1';

export const DEFAULT_USER_MESSAGE = `Bom dia.
*Para melhor atender faça seu pedido pelo link ou ligue.*

⬇️ Cardápio clique aqui👇
https://el-shaday-restaurante.comercio.net.br 

⚠️*NÃO PEGAMOS PEDIDOS PELO WHATSAPP* 

⚠️*PEDIDOS SÃO ENVIADOS POR ROTA DE ENTREGA, E NÃO POR HORÁRIO*


*Atenção para pagamento via PIX  favor enviar o comprovante antecipado pra podermos  enviar o pedido*

💲*Chave : 31988538085*
Maria Helena de Barros Silva
Banco: Itaú`;

export interface CommemorativeEvent {
  id: string;
  name: string;
  dateStr: string;
  month: number; // 1 - 12
  monthName: string;
  icon: string;
  category: 'feriado' | 'comercial' | 'gastronomia' | 'familia';
  defaultMessage: (storeName: string, pixKey?: string) => string;
  chatGptPrompt: (storeName: string) => string;
}

export const ALL_ANNUAL_COMMEMORATIVE_EVENTS: CommemorativeEvent[] = [
  // JANEIRO (Mês 1)
  {
    id: 'ano_novo',
    name: 'Ano Novo & Confraternização Universal',
    dateStr: '01/Jan',
    month: 1,
    monthName: 'Janeiro',
    icon: '🎆',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🎆 *FELIZ ANO NOVO - ${storeName.toUpperCase()}!* 🥂✨\n\nQue este novo ano seja repleto de realizações, saúde e muito sabor! Já estamos prontos para atender você com nosso tempero caseiro caprichado.\n\n🍛 Comece o ano bem alimentado com as nossas marmitas do dia!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Agradecemos por ter você como nosso cliente! ❤️`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária para redes sociais de Ano Novo do restaurante "${storeName}". Uma mesa de refeição festiva brasileira com comida saborosa e fumaça subindo, taças de brinde, luzes douradas de réveillon desfocadas ao fundo, visual elegante e acolhedor de comida caseira, formato vertical 9:16 para WhatsApp.`,
  },
  {
    id: 'dia_do_feirante',
    name: 'Dia da Comida Fresca & Hortifrúti',
    dateStr: 'Janeiro',
    month: 1,
    monthName: 'Janeiro',
    icon: '🥬',
    category: 'gastronomia',
    defaultMessage: (storeName, pixKey) =>
      `🥗 *TEMPERO CASEIRO COM INGREDIENTES FRESCOS - ${storeName.toUpperCase()}* 🍅\n\nAqui toda comida é preparada diariamente com legumes selecionados, carnes frescas e aquele alho e cebola refogados na hora!\n\n🍲 *Peça seu almoço saboroso e nutritivo de hoje!*\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Entregamos na sua empresa ou residência na rota de almoço!`,
    chatGptPrompt: (storeName) =>
      `Close-up gastronômico apetitoso de ingredientes frescos e travessas de comida caseira brasileira recém-preparadas: feijão fumegante, legumes coloridos refogados, salada fresca crocante e carne suculenta. Luz solar matinal, textura nítida dos alimentos para restaurante "${storeName}".`,
  },

  // FEVEREIRO (Mês 2)
  {
    id: 'carnaval',
    name: 'Carnaval & Quarta de Cinzas',
    dateStr: 'Fevereiro',
    month: 2,
    monthName: 'Fevereiro',
    icon: '🎭',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🎭 *CARNAVAL COM ENERGIA & ALMOÇO REFORÇADO - ${storeName.toUpperCase()}!* 🍛\n\nFolia ou descanso? Não importa: o almoço quentinho e reforçado está garantido com a gente!\n\n🍲 *Cardápio Especial de Carnaval:* marmitex completas com feijão tropeiro, carnes suculentas e bebidas geladas para recarregar as energias.\n\n⚠️ Peça com antecedência para inclusão na rota de entregas!\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Bom descanso e bom feriado a todos!`,
    chatGptPrompt: (storeName) =>
      `Fotografia vibrante e apetitosa de almoço brasileiro reforçado para o Carnaval. Marmitex ou prato farto com feijoada ou bife acebolado suculento, couve fininha e arroz solto, confetes e serpentinas coloridas discretas compondo o cenário festivo do restaurante "${storeName}", iluminação dinâmica.`,
  },

  // MARÇO (Mês 3)
  {
    id: 'dia_da_mulher',
    name: 'Dia Internacional da Mulher',
    dateStr: '08/Mar',
    month: 3,
    monthName: 'Março',
    icon: '💐',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `💐 *HOMENAGEM ESPECIAL: DIA DA MULHER - ${storeName.toUpperCase()}* 🌸\n\nHoje é o dia de aplaudir a força, a dedicação e o brilho de todas as mulheres guerreiras!\n\nNeste dia especial, nenhuma mulher precisa ir pro fogão: nós preparamos o almoço mais gostoso da cidade para homenagear você e sua equipe!\n\n🍱 *Marmitex Especiais & Pratos Feitos*\n⚠️ Garanta seu pedido com antecedência!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Parabéns a todas as mulheres pelo seu dia inspirador! 🌹`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária acolhedora e elegante em homenagem ao Dia Internacional da Mulher para o restaurante "${storeName}". Mulheres sorrindo felizes ao redor de uma mesa farta de almoço especial, flores delicadas de presente na mesa, pratos de comida caseira apetitosa, luz suave e calorosa, estética fotográfica profissional.`,
  },
  {
    id: 'dia_do_consumidor',
    name: 'Dia do Consumidor & Promoções',
    dateStr: '15/Mar',
    month: 3,
    monthName: 'Março',
    icon: '🏷️',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🏷️ *SEMANA DO CONSUMIDOR - ${storeName.toUpperCase()}!* 🎁\n\nVocê é a razão do nosso fogão acender todos os dias com carinho!\n\nAproveite nossos combos especiais e porções com valores promocionais para a sua marmita de hoje!\n\n🍲 Comida caseira de verdade com entrega rápida!\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Faça seu pedido e aproveite os mimos do Dia do Consumidor!`,
    chatGptPrompt: (storeName) =>
      `Banner promocional gastronômico profissional para o "Dia do Consumidor" em restaurante brasileiro "${storeName}". Marmitex aberta apetitosa com vapor subindo, acompanhada de refrigerante gelado com gotículas de água, fundo em tons verde e dourado com acabamento publicitário moderno.`,
  },

  // ABRIL (Mês 4)
  {
    id: 'sexta_feira_santa',
    name: 'Sexta-feira Santa (Semana Santa)',
    dateStr: 'Sexta Santa',
    month: 4,
    monthName: 'Abril',
    icon: '🐟',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🐟 *SEXTA-FEIRA SANTA: PRATOS COM PEIXE - ${storeName.toUpperCase()}* 🌿\n\nRespeitando a tradição, preparamos pratos especiais com peixes frescos assados e ensopados, batatas e acompanhamentos caprichados.\n\n⚠️ *Vagas limitadas na rota de entregas! Encomende com antecedência!*\n\n${
        pixKey ? `💲 *PIX para reservas:* ${pixKey}\n` : ''
      }Um dia santo de muita paz e reflexão em família.`,
    chatGptPrompt: (storeName) =>
      `Fotografia de estúdio gastronômico de prato especial de Sexta-feira Santa para o restaurante "${storeName}". Filé de peixe dourado assado no azeite com batatas, azeitonas, arroz branco e salada verde fresca. Ambiente tranquilo e familiar, iluminação natural suave, alta resolução.`,
  },
  {
    id: 'pascoa',
    name: 'Domingo de Páscoa',
    dateStr: 'Páscoa',
    month: 4,
    monthName: 'Abril',
    icon: '🕊️',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `🕊️ *FELIZ PÁSCOA - ${storeName.toUpperCase()}* ✝️\n\nPáscoa é tempo de união, família reunida e uma mesa bem servida sem preocupação na cozinha!\n\n🍲 *Encomendas para o Almoço de Páscoa:*\n- Pratos tamanho família\n- Marmitex completas e sobremesas\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Desejamos a todos os nossos clientes uma Páscoa cheia de bênçãos e paz!`,
    chatGptPrompt: (storeName) =>
      `Foto publicitária emocionante de almoço de Páscoa em família para restaurante "${storeName}". Mesa festiva com travessa farta de comida caseira, família brasileira sorridente brindando, decoração leve de Páscoa com tons pastéis, iluminação acolhedora e calorosa.`,
  },
  {
    id: 'tiradentes',
    name: 'Tiradentes (Feriado Nacional)',
    dateStr: '21/Abr',
    month: 4,
    monthName: 'Abril',
    icon: '🇧🇷',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🇧🇷 *FERIADO DE TIRADENTES: ALMOÇO GARANTIDO NO ${storeName.toUpperCase()}!* ☀️\n\nFeriado é dia de relaxar! Deixe o almoço com a gente e aproveite o dia de folga com sua família.\n\n🍲 Marmitas quentinhas e pratos feitos na hora com entrega na sua porta.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Peça antecipado para garantir sua rota!`,
    chatGptPrompt: (storeName) =>
      `Fotografia comercial para feriado brasileiro do restaurante "${storeName}". Marmitex e prato de almoço tradicional (feijoada ou churrasco brasileiro com farofa e vinagrete) servido ao ar livre sob sol agradável, sensação de lazer e descanso, qualidade fotográfica publicitária.`,
  },

  // MAIO (Mês 5)
  {
    id: 'dia_do_trabalhador',
    name: 'Dia do Trabalhador',
    dateStr: '01/Mai',
    month: 5,
    monthName: 'Maio',
    icon: '👷',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `👷 *1º DE MAIO: DIA DO TRABALHADOR - ${storeName.toUpperCase()}* 🛠️\n\nAquele que acorda cedo e faz o Brasil girar merece o melhor almoço do mundo!\n\nHoje é o dia de descansar os braços e saborear uma comida farta, caseira e quentinha feita especialmente para você trabalhador!\n\n🥩 *Cardápio Reforçado com carnes assadas, feijão tropeiro e refrigerante gelado!*\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Parabéns a todos os trabalhadores e trabalhadoras pelo seu dia!`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária para o Dia do Trabalhador em restaurante brasileiro "${storeName}". Almoço farto e reforçado servido com carinho: bife suculento, ovo frito perfeito, arroz e feijão cremoso, trabalhadores de diferentes profissões reunidos felizes em um intervalo com comida farta, alta definição.`,
  },
  {
    id: 'dia_das_maes',
    name: 'Dia das Mães (Maior Almoço do Ano)',
    dateStr: '2º Dom. Maio',
    month: 5,
    monthName: 'Maio',
    icon: '🌸',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `🌸 *FELIZ DIA DAS MÃES - ${storeName.toUpperCase()}* 🌸\n\nNeste domingo tão especial, mãe não vai pra cozinha! Deixe o almoço por nossa conta e curta cada segundo com ela.\n\n🍱 *Almoço Especial de Dia das Mães:*\n- Marmitex P, M e G caprichadas com o melhor tempero\n- Pratos em porções tamanho família\n- Bebidas e sobremesas deliciosas\n\n⚠️ *FAÇA SUA RESERVA ANTECIPADA:* garanta a entrega no horário perfeito!\n\n${
        pixKey ? `💲 *PIX para encomendas: ${pixKey}*\n` : ''
      }Desejamos a todas as mamães um dia repleto de carinho e paz! ❤️`,
    chatGptPrompt: (storeName) =>
      `Fotografia cinematográfica publicitária de Dia das Mães para restaurante "${storeName}". Família reunida sorrindo em volta de uma mesa de domingo farta com travessas fumegantes de comida caseira deliciosa, mãe sendo abraçada com carinho, iluminação quente e acolhedora, padrão de revista gastronômica vertical 9:16.`,
  },
  {
    id: 'corpus_christi',
    name: 'Corpus Christi (Feriado Prolongado)',
    dateStr: 'Maio/Junho',
    month: 5,
    monthName: 'Maio',
    icon: '⛪',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `⛪ *FERIADO DE CORPUS CHRISTI - ${storeName.toUpperCase()}* 🍲\n\nFeriado prolongado para recarregar as energias com quem a gente ama! Estaremos atendendo normalmente para entregar o melhor almoço na sua casa.\n\n⚠️ Envie seu pedido cedo para entrar na primeira rota de entregas!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Bom feriado a todos!`,
    chatGptPrompt: (storeName) =>
      `Foto gastronômica atraente para feriado prolongado no restaurante "${storeName}". Prato de comida caseira bem servido com feijão caseiro, arroz, carne assada macia e guarnições, mesa de almoço descontraída em dia de feriado.`,
  },

  // JUNHO (Mês 6)
  {
    id: 'dia_dos_namorados',
    name: 'Dia dos Namorados',
    dateStr: '12/Jun',
    month: 6,
    monthName: 'Junho',
    icon: '❤️',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `❤️ *DIA DOS NAMORADOS COM SABOR ESPECIAL - ${storeName.toUpperCase()}* 🌹\n\nCelebre o amor com uma refeição deliciosa sem trabalho e sem louça pra lavar!\n\n🍽️ Marmitex e pratos especiais preparados para um momento inesquecível a dois.\n\n⚠️ Peça com antecedência para garantir sua rota!\n\n${
        pixKey ? `💲 *PIX para pedidos: ${pixKey}*\n` : ''
      }Feliz Dia dos Namorados a todos os casais apaixonados! 💕`,
    chatGptPrompt: (storeName) =>
      `Fotografia romântica e elegante de jantar ou almoço de Dia dos Namorados em restaurante acolhedor "${storeName}". Mesa para casal decorada com velas suaves, refeição farta e saborosa apresentada com requinte, clima acolhedor e romântico, foto gastronômica de alta qualidade.`,
  },
  {
    id: 'sao_joao_festa_junina',
    name: 'Festas Juninas & São João',
    dateStr: '24/Jun',
    month: 6,
    monthName: 'Junho',
    icon: '🌽',
    category: 'gastronomia',
    defaultMessage: (storeName, pixKey) =>
      `🌽 *TEMPERO DE SÃO JOÃO & FESTA JUNINA - ${storeName.toUpperCase()}!* 🔥\n\nMês junino pede comida boa de verdade: feijão tropeiro saboroso, couve refogada, linguiça artesanal e pratos típicos caprichados!\n\n🍲 *Peça hoje a sua marmita caipira com o autêntico sabor da roça!*\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Viva São João e bom apetite! 🤠🎉`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária com tema de Festa Junina e São João para restaurante de comida caseira "${storeName}". Travessas de feijão tropeiro fumegante com torresmo crocante, couve, milho verde e linguiça, toalha xadrez junina, bandeirolas coloridas discretas ao fundo, composição quente e muito apetitosa.`,
  },

  // JULHO (Mês 7)
  {
    id: 'dia_da_pizza_massas',
    name: 'Dia das Massas & Comida Boa',
    dateStr: '10/Jul',
    month: 7,
    monthName: 'Julho',
    icon: '🍝',
    category: 'gastronomia',
    defaultMessage: (storeName, pixKey) =>
      `🍝 *DIA DAS MASSAS & PRATOS CAPRICHADOS - ${storeName.toUpperCase()}!* 🧀\n\nHoje é dia de um macarrão caseiro com molho encorpado, lasanha ou aquela marmita reforçada com massa artesanal!\n\n🍲 Garanta o seu almoço quentinho para alegrar o dia no trabalho ou em casa.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Faça seu pedido agora mesmo!`,
    chatGptPrompt: (storeName) =>
      `Foto gastronômica profissional em close-up de massa caseira com queijo derretido puxando e molho de carne encorpado, folhas de manjericão fresco, iluminação quente de restaurante caseiro "${storeName}".`,
  },
  {
    id: 'dia_do_amigo',
    name: 'Dia do Amigo (Almoço em Grupo)',
    dateStr: '20/Jul',
    month: 7,
    monthName: 'Julho',
    icon: '🤝',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🤝 *DIA DO AMIGO: PEÇA JUNTO COM SUA TURMA NO ${storeName.toUpperCase()}!* 🍱\n\nAmigo de verdade divide o marmitex e compartilha o melhor sabor! Reúna os colegas de trabalho ou amigos e façam o pedido em conjunto para entrega única!\n\n🍲 *Combos especiais para grupos e empresas.*\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Marque seu amigo que vai pagar o almoço hoje! 😂👏`,
    chatGptPrompt: (storeName) =>
      `Fotografia alegre de grupo de amigos e colegas de trabalho em uma empresa almoçando marmitas apetitosas juntos, sorrindo e conversando, clima de camaradagem e amizade, foto publicitária para restaurante "${storeName}".`,
  },
  {
    id: 'dia_dos_avos',
    name: 'Dia dos Avós (Tempero de Vó)',
    dateStr: '26/Jul',
    month: 7,
    monthName: 'Julho',
    icon: '👵',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `👵 *DIA DOS AVÓS: AQUELE TEMPERO COM GOSTINHO DE INFÂNCIA!* 👴❤️\n\nNossa inspiração vem daquela comidinha com carinho de vó: feita sem pressa, com alho dourado e muito amor.\n\n🍲 Homenageie seus avós com um almoço caseiro inesquecível do *${storeName}*!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Um abraço com muito amor a todos os vovôs e vovós!`,
    chatGptPrompt: (storeName) =>
      `Fotografia emocionante e acolhedora de Dia dos Avós para restaurante "${storeName}". Vovô e vovó sorrindo cercados pelos netos à mesa de almoço de domingo, travessas de comida caseira farta e apetitosa, luz solar quente e nostálgica de afeto familiar.`,
  },

  // AGOSTO (Mês 8)
  {
    id: 'dia_dos_pais',
    name: 'Dia dos Pais (Almoço do Paizão)',
    dateStr: '2º Dom. Agosto',
    month: 8,
    monthName: 'Agosto',
    icon: '👔',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `👔 *DIA DOS PAIS É DIA DE ALMOÇO REFORÇADO NO ${storeName.toUpperCase()}!* 🍖\n\nNeste Dia dos Pais, o paizão não cozinha! Ele merece um almoço de respeito com carnes assadas, churrasco e aquele sabor caseiro de verdade.\n\n🥩 *Cardápio Especial de Dia dos Pais:*\n- Marmitex reforçadas para o paizão\n- Carnes assadas suculentas e porções família\n- Refrigerantes e bebidas bem geladas\n\n⚠️ *Reserve antecipado para garantir sua entrega!*\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Parabéns a todos os pais pela dedicação e amor diário! 🏆`,
    chatGptPrompt: (storeName) =>
      `Fotografia comercial e apetitosa para campanha de Dia dos Pais do restaurante "${storeName}". Uma mesa rústica brasileira com almoço farto de carnes grelhadas e assadas suculentas com brilho de churrasco, farofa artesanal, vinagrete, arroz branco e feijão caseiro. Um pai com seus filhos sorrindo felizes à mesa, iluminação acolhedora e natural.`,
  },
  {
    id: 'dia_do_estudante',
    name: 'Dia do Estudante & Universitário',
    dateStr: '11/Ago',
    month: 8,
    monthName: 'Agosto',
    icon: '🎓',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🎓 *DIA DO ESTUDANTE: MARMITA PRÁTICA E NUTRITIVA!* 📚\n\nQuem estuda precisa de energia e foco! Não perca tempo cozinhando na correria das aulas e provas: peça nossa marmita com entrega pontual no seu horário de almoço!\n\n🍲 Comida balanceada, saborosa e com preço justo para o estudante.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Bons estudos e bom almoço!`,
    chatGptPrompt: (storeName) =>
      `Fotografia moderna de estudante universitário brasileiro abrindo uma marmitex de almoço caseiro apetitosa ao lado de cadernos e notebook em mesa de estudos, fumaça subindo da comida, sensação de praticidade e energia nutritiva para restaurante "${storeName}".`,
  },

  // SETEMBRO (Mês 9)
  {
    id: 'independencia_brasil',
    name: 'Independência do Brasil (7 de Setembro)',
    dateStr: '07/Set',
    month: 9,
    monthName: 'Setembro',
    icon: '🇧🇷',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🇧🇷 *7 DE SETEMBRO: ALMOÇO DE FERIADO NO ${storeName.toUpperCase()}!* ☀️\n\nFeriado da Pátria com a melhor culinária do Brasil na sua mesa!\n\n🍲 Não esquente a cabeça no fogão: estaremos atendendo com nossas marmitas completas para você curtir o feriado descansando.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Peça antecipado para inclusão na rota de entregas!`,
    chatGptPrompt: (storeName) =>
      `Fotografia temática do feriado de 7 de Setembro para restaurante brasileiro "${storeName}". Feijoada brasileira completa fumegante com arroz branco, couve refogada, laranja e farofa, detalhe sutil de fita verde e amarela ao fundo, luz natural ensolarada de feriado.`,
  },
  {
    id: 'dia_do_cliente',
    name: 'Dia do Cliente (Nosso Maior Motivo)',
    dateStr: '15/Set',
    month: 9,
    monthName: 'Setembro',
    icon: '🎉',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🎉 *DIA DO CLIENTE: OBRIGADO PELA SUA PREFERÊNCIA!* 🎁\n\nHoje é o dia de agradecer a você que confia no tempero, no capricho e na pontualidade do *${storeName}*!\n\n🍲 Peça sua marmita hoje e receba nosso carinho especial em cada garfada!\n\n${
        pixKey ? `💲 *Chave PIX oficial:* ${pixKey}\n` : ''
      }Você faz a nossa história acontecer todos os dias! Nosso muito obrigado! 🤝`,
    chatGptPrompt: (storeName) =>
      `Banner promocional gastronômico moderno e atraente comemorando o "Dia do Cliente" no restaurante "${storeName}". Close-up apetitoso em marmitex de comida caseira brasileira aberta e quentinha com bife acebolado, feijão cremoso e arroz, fumaça suave subindo, elementos gráficos elegantes de celebração com confetes dourados discretos.`,
  },
  {
    id: 'inicio_primavera',
    name: 'Início da Primavera (Pratos Leves & Sucos)',
    dateStr: '22/Set',
    month: 9,
    monthName: 'Setembro',
    icon: '🌺',
    category: 'gastronomia',
    defaultMessage: (storeName, pixKey) =>
      `🌺 *BEM-VINDA PRIMAVERA NO ${storeName.toUpperCase()}!* 🥗\n\nOs dias mais coloridos chegaram com opções de pratos frescos, saladas crocantes, legumes grelhados e sucos naturais geladinhos para o seu almoço!\n\n🍹 Marmitas balanceadas e leves para encarar a tarde de trabalho com disposição.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Peça já o seu almoço da primavera!`,
    chatGptPrompt: (storeName) =>
      `Fotografia gastronômica fresca e luminosa para a chegada da Primavera no restaurante "${storeName}". Prato de almoço leve com filé grelhado, salada colorida com tomates cereja e folhas frescas, copo de suco natural de frutas com gotas de condensação, flores primaveris ao fundo, visual saudável e revigorante.`,
  },

  // OUTUBRO (Mês 10)
  {
    id: 'dia_das_criancas',
    name: 'Dia das Crianças & N. Sra. Aparecida',
    dateStr: '12/Out',
    month: 10,
    monthName: 'Outubro',
    icon: '🎈',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🎈 *DIA DAS CRIANÇAS & FERIADO - ${storeName.toUpperCase()}* 🧸\n\nFeriado de alegria e almoço gostoso para toda a família e criançada!\n\n🍗 Pratos saborosos que a criançada ama: bife acebolado, filé de frango empanado, macarrão e sobremesas deliciosas.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Que a fé e a alegria infantil abençoem o seu lar!`,
    chatGptPrompt: (storeName) =>
      `Fotografia familiar divertida e alegre para o Dia das Crianças no restaurante "${storeName}". Crianças sorrindo comendo almoço saboroso e colorido à mesa com os pais, balões festivos ao fundo, comida caseira brasileira apetitosa, ambiente caloroso e festivo.`,
  },
  {
    id: 'dia_dos_professores',
    name: 'Dia dos Professores (Homenagem aos Mestres)',
    dateStr: '15/Out',
    month: 10,
    monthName: 'Outubro',
    icon: '📖',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `📖 *HOMENAGEM AO DIA DOS PROFESSORES - ${storeName.toUpperCase()}* 🍎\n\nA todos os educadores que dedicam sua vida a ensinar com amor: nosso respeito e admiração!\n\nHoje o almoço dos professores nas escolas e em casa é por nossa conta com entrega pontual na hora do intervalo!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Obrigado, mestres, por construírem o nosso futuro! 👏`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária para o Dia dos Professores em restaurante "${storeName}". Professores sorrindo na sala dos professores durante o intervalo almoçando marmitas caseiras saborosas e quentinhas, maçã vermelha brilhante e livros na mesa, iluminação acolhedora e positiva.`,
  },
  {
    id: 'halloween',
    name: 'Halloween & Fim de Outubro',
    dateStr: '31/Out',
    month: 10,
    monthName: 'Outubro',
    icon: '🎃',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🎃 *HALLOWEEN SEM SUSTOS NO PREÇO - ${storeName.toUpperCase()}!* 👻\n\nAqui o único susto é de tanta gostosura na sua marmita!\n\n🍲 Almoço quentinho, saboroso e com fartura para o seu dia!\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Gostosuras garantidas na nossa rota de entregas!`,
    chatGptPrompt: (storeName) =>
      `Banner fotográfico divertido e gastronômico para Halloween no restaurante "${storeName}". Marmitex aberta apetitosa com carnes e feijão, pequenas abóboras decorativas esculpidas discretas ao lado, iluminação de velas suave e acolhedora, composição gastronômica sem perder o apetite.`,
  },

  // NOVEMBRO (Mês 11)
  {
    id: 'finados',
    name: 'Dia de Finados (Feriado com Atendimento)',
    dateStr: '02/Nov',
    month: 11,
    monthName: 'Novembro',
    icon: '🕊️',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🕊️ *FERIADO DE FINADOS - ${storeName.toUpperCase()}* 🤍\n\nEstaremos atendendo para levar comodidade e alimentação de qualidade para você e sua família neste dia de memórias e respeito.\n\n🍲 Envie seu pedido cedo para receber na primeira rota de entregas.\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Um dia sereno e de paz a todos.`,
    chatGptPrompt: (storeName) =>
      `Fotografia gastronômica serena e elegante para feriado de Finados em restaurante "${storeName}". Prato de comida caseira bem apresentado com luz natural suave, ambiente de tranquilidade e acolhimento familiar.`,
  },
  {
    id: 'proclamacao_republica',
    name: 'Proclamação da República',
    dateStr: '15/Nov',
    month: 11,
    monthName: 'Novembro',
    icon: '🏛️',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🏛️ *FERIADO DA REPÚBLICA: ALMOÇO PRONTO NO ${storeName.toUpperCase()}!* 🇧🇷\n\nAproveite o feriado com tranquilidade e deixe as panelas de lado! Preparamos marmitas e pratos reforçados para o seu almoço de descanso.\n\n${
        pixKey ? `💲 *PIX oficial:* ${pixKey}\n` : ''
      }Peça com antecedência e receba quentinho na sua porta!`,
    chatGptPrompt: (storeName) =>
      `Foto publicitária comercial para o feriado de 15 de Novembro do restaurante "${storeName}". Almoço brasileiro suculento ao ar livre em dia de feriado, com carne assada, feijão tropeiro, farofa e salada fresca, alta resolução fotográfica.`,
  },
  {
    id: 'consciencia_negra',
    name: 'Dia da Consciência Negra (Tradição e Sabor)',
    dateStr: '20/Nov',
    month: 11,
    monthName: 'Novembro',
    icon: '🍲',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🍲 *CONSCIÊNCIA NEGRA: CELEBRAÇÃO DA NOSSA CULINÁRIA - ${storeName.toUpperCase()}* ✊🏾\n\nA culinária brasileira carrega a alma, os temperos e a sabedoria da cultura afro-brasileira: a feijoada rica, as pimentas aromáticas e os refogados saborosos!\n\nHoje é dia de saborear essa herança gastronômica com nossa feijoada caprichada!\n\n${
        pixKey ? `💲 *PIX:* ${pixKey}\n` : ''
      }Viva a nossa cultura e tradição!`,
    chatGptPrompt: (storeName) =>
      `Fotografia gastronômica culturalmente rica em homenagem ao Dia da Consciência Negra para restaurante "${storeName}". Panela de barro tradicional fumegante com feijoada completa brasileira rica em carnes nobres, ladeada por farofa dourada, couve verde-escura fininha, fatias de laranja e pimentas vermelhas decorativas, estética artística e apetitosa.`,
  },
  {
    id: 'black_friday',
    name: 'Black Friday do Restaurante',
    dateStr: 'Última Sex. Nov',
    month: 11,
    monthName: 'Novembro',
    icon: '⚡',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `⚡ *BLACK FRIDAY NO ${storeName.toUpperCase()}!* 🖤🔥\n\nA melhor promoção de almoço da cidade chegou! Descontos especiais na compra de marmitex e combos com refrigerante para turbinar o seu almoço de sexta!\n\n🍱 *Marmitex reforçadas com preço de Black Friday!*\n⚠️ Vagas na rota de entrega esgotam rápido, peça já!\n\n${
        pixKey ? `💲 *PIX oficial:* ${pixKey}\n` : ''
      }Aproveite a Black Friday com sabor caseiro de verdade!`,
    chatGptPrompt: (storeName) =>
      `Banner publicitário moderno de Black Friday para restaurante e marmitaria "${storeName}". Estética elegante preta e dourada com marmitex aberta brilhante soltando fumaça, bife acebolado e fritas crocantes, tipografia sutil de "Black Friday", visual de alto impacto para divulgação no WhatsApp.`,
  },

  // DEZEMBRO (Mês 12)
  {
    id: 'confraternizacoes_empresas',
    name: 'Confraternizações & Encerramento de Empresas',
    dateStr: 'Dezembro',
    month: 12,
    monthName: 'Dezembro',
    icon: '🥂',
    category: 'comercial',
    defaultMessage: (storeName, pixKey) =>
      `🥂 *ENCOMENDAS PARA CONFRATERNIZAÇÃO DE EMPRESAS - ${storeName.toUpperCase()}* 🏢\n\nFechando o ano com sua equipe? Nós cuidamos do almoço de confraternização da sua empresa!\n\n🍱 Atendemos grandes pedidos de marmitex e pratos especiais com pontualidade, nota e recibo.\n\n⚠️ *Agende a data da sua equipe com antecedência!*\n\n${
        pixKey ? `💲 *PIX para reservas:* ${pixKey}\n` : ''
      }Garanta o almoço de sucesso do seu time!`,
    chatGptPrompt: (storeName) =>
      `Fotografia publicitária para empresas de almoço de confraternização de fim de ano do restaurante "${storeName}". Equipe de trabalho em escritório ou obra reunida feliz em mesa farta com marmitas e travessas de almoço especial de fim de ano, brindando e comemorando resultados, fotografia corporativa acolhedora e festiva.`,
  },
  {
    id: 'natal',
    name: 'Véspera & Natal (Ceia e Almoço Natalino)',
    dateStr: '24 e 25/Dez',
    month: 12,
    monthName: 'Dezembro',
    icon: '🎄',
    category: 'familia',
    defaultMessage: (storeName, pixKey) =>
      `🎄 *FELIZ NATAL - ${storeName.toUpperCase()}* 🎅✨\n\nQue a magia do Natal encha a sua casa de paz, harmonia e fartura!\n\n🍗 *Aceitamos encomendas para almoço de Natal:*\n- Aves assadas douradas, lombo e pernil suculento\n- Farofa natalina rica, arroz especial e saladas\n\n⚠️ *Encomendas limitadas! Reserve a sua antes que encerrem as vagas!*\n\n${
        pixKey ? `💲 *PIX oficial:* ${pixKey}\n` : ''
      }Um Natal abençoado para você e toda a sua família! ❤️`,
    chatGptPrompt: (storeName) =>
      `Fotografia cinematográfica e festiva de ceia e almoço natalino de fim de ano para o restaurante "${storeName}". Mesa farta decorada com luzes douradas, ave natalina assada dourada e suculenta, arroz festivo, farofa rica de castanhas e travessas típicas brasileiras fumegantes, alta resolução gastronômica vertical 9:16.`,
  },
  {
    id: 'reveillon',
    name: 'Réveillon & Virada de Ano',
    dateStr: '31/Dez',
    month: 12,
    monthName: 'Dezembro',
    icon: '🍾',
    category: 'feriado',
    defaultMessage: (storeName, pixKey) =>
      `🍾 *RÉVEILLON & VIRADA DE ANO COM O ${storeName.toUpperCase()}!* 🥂🎆\n\nDespedindo-se de mais um ano com gratidão e esperança! Nós preparamos as melhores opções para o seu almoço e celebração da virada.\n\n🍛 *Encomendas abertas para o fechamento do ano!*\n\n${
        pixKey ? `💲 *Chave PIX:* ${pixKey}\n` : ''
      }Que venha um Ano Novo próspero, com muita saúde, paz e fartura!`,
    chatGptPrompt: (storeName) =>
      `Fotografia de celebração de Réveillon para restaurante "${storeName}". Mesa festiva com comida farta brasileira da sorte (lentilha saborosa, carne assada dourada, arroz branco festivo), taças com champanhe borbulhante, brilho de fogos de artifício ao fundo, alta resolução estética para WhatsApp.`,
  },
];

const MONTH_NAMES = [
  'Todos',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  customers,
  settings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'datas_comemorativas'>('datas_comemorativas');
  const [selectedEventId, setSelectedEventId] = useState<string>('dia_das_maes');
  const [monthFilter, setMonthFilter] = useState<number>(0); // 0 = Todos, 1-12 = Meses
  const [eventSearch, setEventSearch] = useState<string>('');

  const [message, setMessage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || DEFAULT_USER_MESSAGE;
    } catch {
      return DEFAULT_USER_MESSAGE;
    }
  });

  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomersList, setShowCustomersList] = useState(false);

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('pt-BR');
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const storeName = settings.storeName || 'El Shaday Restaurante';

  // Filter commemorative events by month and text search
  const filteredEvents = useMemo(() => {
    return ALL_ANNUAL_COMMEMORATIVE_EVENTS.filter((e) => {
      const matchesMonth = monthFilter === 0 || e.month === monthFilter;
      const q = eventSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.monthName.toLowerCase().includes(q) ||
        e.dateStr.toLowerCase().includes(q);
      return matchesMonth && matchesSearch;
    });
  }, [monthFilter, eventSearch]);

  const selectedEvent =
    ALL_ANNUAL_COMMEMORATIVE_EVENTS.find((e) => e.id === selectedEventId) ||
    ALL_ANNUAL_COMMEMORATIVE_EVENTS[0];

  const currentChatGptPrompt = selectedEvent.chatGptPrompt(storeName);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentChatGptPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleOpenChatGPT = () => {
    window.open('https://chatgpt.com/', '_blank');
  };

  const handleSelectEvent = (event: CommemorativeEvent) => {
    setSelectedEventId(event.id);
    const generatedMsg = event.defaultMessage(storeName, settings.pixKey);
    setMessage(generatedMsg);
  };

  const handleSaveDefault = () => {
    try {
      localStorage.setItem(STORAGE_KEY, message);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWhatsAppGeneral = () => {
    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendToCustomer = (customer: Customer) => {
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleInsertTag = (tagText: string) => {
    setMessage((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + tagText);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      (c.phone && c.phone.includes(searchCustomer))
  );

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[94vh]">
        {/* Header (Target element) */}
        <div className="bg-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-emerald-300 font-bold shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Disparo de Mensagens no WhatsApp
                </h3>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {ALL_ANNUAL_COMMEMORATIVE_EVENTS.length} Datas Anuais
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200 mt-0.5">
                Todas as datas comemorativas do ano com prompt de imagem pronto para ChatGPT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-5 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('datas_comemorativas')}
            className={`py-3 px-3 sm:px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'datas_comemorativas'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarHeart className="w-4 h-4 text-rose-500" />
            <span>Calendário Anual de Datas & ChatGPT</span>
            <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {ALL_ANNUAL_COMMEMORATIVE_EVENTS.length} Datas
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-3 sm:px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <span>Cardápio & Mensagem Diária</span>
          </button>
        </div>

        {/* Feedback alert */}
        {savedSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-900 font-bold flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>Mensagem salva como padrão!</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: CALENDÁRIO COMPLETO ANUAL DE DATAS COMEMORATIVAS */}
          {activeTab === 'datas_comemorativas' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Filtro de Meses e Busca */}
              <div className="bg-amber-50/70 border border-amber-200 p-3 sm:p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-950 block uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    Selecione a Data Comemorativa do Ano:
                  </span>
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar data (ex: mães, natal, páscoa...)"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-amber-300 text-xs bg-white text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Filtro de Meses (Jan a Dez) */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
                  {MONTH_NAMES.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setMonthFilter(idx)}
                      className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap text-xs ${
                        monthFilter === idx
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'bg-white/80 hover:bg-white text-amber-950 border border-amber-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Grid com todas as datas do período selecionado */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredEvents.map((event) => {
                    const isSelected = selectedEventId === event.id;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                            : 'bg-white/90 border-amber-200 hover:bg-white hover:border-amber-300 text-slate-700'
                        }`}
                      >
                        <span className="text-xl shrink-0">{event.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {event.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                            <span>{event.monthName}</span>
                            <strong className="text-emerald-700 font-mono font-bold">
                              {event.dateStr}
                            </strong>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredEvents.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-amber-900">
                      Nenhuma data encontrada para este filtro.
                    </div>
                  )}
                </div>
              </div>

              {/* Card do Prompt para o ChatGPT */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                        <span>Prompt de Imagem para o ChatGPT</span>
                        <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-md font-mono">
                          {selectedEvent.name}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Copie este prompt e cole no ChatGPT para gerar uma imagem fotográfica de alta qualidade para o WhatsApp
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenChatGPT}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-bold underline shrink-0"
                  >
                    <span>Abrir ChatGPT</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-200 leading-relaxed max-h-28 overflow-y-auto">
                  {currentChatGptPrompt}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      copiedPrompt
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Prompt Copiado!' : 'Copiar Prompt para o ChatGPT'}</span>
                  </button>

                  <span className="text-[10px] text-slate-400">
                    💡 Dica: No ChatGPT, basta colar e teclar Enter para ele gerar a imagem.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MENSAGEM DIÁRIA E MODELOS PRONTOS */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Modelos de Mensagem Prontos:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMessage(DEFAULT_USER_MESSAGE)}
                    className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Cardápio Online & Avisos (El Shaday)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMessage(
                        `${greeting}!\n🍽️ *CARDÁPIO DO DIA - ${storeName}* (${todayFormatted})\n\n🍲 *Opções de Marmitex:*\n- Marmitex P (R$ 16,00)\n- Marmitex M (R$ 20,00)\n- Marmitex G (R$ 25,00)\n\n🥤 *Bebidas Geladas:*\n- Refrigerante Lata (R$ 6,00)\n- Suco Natural (R$ 8,00)\n- Água Mineral (R$ 4,00)\n\n⚠️ Faça seu pedido com antecedência para rota de entrega!\n\n${
                          settings.pixKey ? `💲 *PIX: ${settings.pixKey}* (${storeName})\n` : ''
                        }Aguardamos seu pedido!`
                      )
                    }
                    className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Marmitas do Dia & Preços
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMessage(
                        `⚠️ *AVISO IMPORTANTE - ${storeName}*\n\nInformamos que os pedidos de almoço encerram às 13:30h.\n\nFavor enviar os pedidos com antecedência para inclusão na rota de entregas.\n\n${
                          settings.pixKey ? `Chave PIX: *${settings.pixKey}*\n` : ''
                        }Agradecemos a compreensão de todos!`
                      )
                    }
                    className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Aviso de Horário & Rotas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Text Area for Message Data */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Texto Formatado para o WhatsApp:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDefault}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar como Padrão Diário</span>
                </button>
              </div>
            </div>

            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite ou edite aqui a mensagem que deseja enviar aos grupos ou clientes..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 font-mono text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
            />

            {/* Quick insert tag buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              <span className="text-slate-400 font-medium">Inserir:</span>
              <button
                type="button"
                onClick={() => handleInsertTag(`${greeting}.`)}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                + {greeting}
              </button>
              <button
                type="button"
                onClick={() => handleInsertTag(`📅 Data: ${todayFormatted}`)}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                + Data de Hoje
              </button>
              {settings.pixKey && (
                <button
                  type="button"
                  onClick={() =>
                    handleInsertTag(
                      `💲*Chave PIX: ${settings.pixKey}*\n${settings.ownerName || settings.storeName}`
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold"
                >
                  + Chave PIX da Loja
                </button>
              )}
            </div>
          </div>

          {/* Visual Preview style WhatsApp Balloon */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Pré-visualização no WhatsApp:
            </span>
            <div className="bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-xs p-3.5 shadow-xs max-w-lg whitespace-pre-wrap text-xs font-sans leading-relaxed border border-emerald-200">
              {message || '(Mensagem em branco)'}
              <div className="text-[9px] text-slate-400 text-right mt-1.5 font-sans">
                {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Enviada
              </div>
            </div>
          </div>

          {/* Accordion: Send to registered customers individually */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowCustomersList(!showCustomersList)}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-between text-xs font-bold text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Enviar para Clientes Cadastrados ({customers.length})</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">
                {showCustomersList ? 'Ocultar Lista ▲' : 'Ver Clientes ▼'}
              </span>
            </button>

            {showCustomersList && (
              <div className="p-3 border-t border-slate-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome ou WhatsApp..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="pt-1.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400">{c.phone || 'Sem telefone'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendToCustomer(c)}
                        className="py-1 px-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-[11px] flex items-center gap-1 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Enviar</span>
                      </button>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">
                      Nenhum cliente encontrado
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Button: Open WhatsApp for Groups / Broadcast Lists */}
            <button
              type="button"
              onClick={handleOpenWhatsAppGeneral}
              className="py-2.5 px-4 sm:px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 transition shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp (Grupos / Listas)</span>
            </button>

            {/* Copy message button */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                copiedMessage
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
                  : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMessage ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
