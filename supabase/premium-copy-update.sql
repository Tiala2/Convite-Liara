update public.event_settings
   set invitation_message = 'Com muito carinho, estamos preparando cada detalhe para a chegada da nossa pequena Liara. E esse momento ficará ainda mais especial com a presença de pessoas queridas como você. Esperamos compartilhar esse dia ao seu lado! 💕',
       final_message = 'Nos vemos em breve para celebrar juntos esse momento tão especial! Será uma alegria receber você. 💕',
       updated_at = now()
 where baby_name = 'Liara';
