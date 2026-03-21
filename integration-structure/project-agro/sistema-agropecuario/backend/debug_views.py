import re

with open('apps/fiscal/views.py', 'r') as f:
    content = f.read()

new_content = content.replace(
    '''        if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
            return True''',
    '''        if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
            print("STAFF OR SUPERUSER")
            return True'''
)

new_content = new_content.replace(
    '''                if user.email.strip().lower() == nfe.destinatario_email.strip().lower():
                    return True''',
    '''                if user.email.strip().lower() == nfe.destinatario_email.strip().lower():
                    print("EMAIL MATCH")
                    return True'''
)

new_content = new_content.replace(
    '''            if ModulePermission.objects.filter(user=user, module='fiscal', can_respond=True).exists():
                return True''',
    '''            if ModulePermission.objects.filter(user=user, module='fiscal', can_respond=True).exists():
                print("PERM MATCH")
                return True'''
)
new_content = new_content.replace(
    '''            if getattr(user, 'username', None) and ModulePermission.objects.filter(user__username=user.username, module='fiscal', can_respond=True).exists():
                return True''',
    '''            if getattr(user, 'username', None) and ModulePermission.objects.filter(user__username=user.username, module='fiscal', can_respond=True).exists():
                print("USERNAME MATCH")
                return True'''
)
new_content = new_content.replace(
    '''            if getattr(user, 'email', None) and ModulePermission.objects.filter(user__email=user.email, module='fiscal', can_respond=True).exists():
                return True''',
    '''            if getattr(user, 'email', None) and ModulePermission.objects.filter(user__email=user.email, module='fiscal', can_respond=True).exists():
                print("USER EMAIL MATCH")
                return True'''
)

with open('apps/fiscal/views.py', 'w') as f:
    f.write(new_content)
