# Copyright (c) 2012-2016 Seafile Ltd.

from django.conf.urls import url
from seahub.oauth.views import oauth_login, oauth_callback, \
        oauth_work_weixin_login, oauth_work_weixin_callback

urlpatterns = [
    url(r'login/$', oauth_login, name='oauth_login'),
    url(r'callback/$', oauth_callback, name='oauth_callback'),
    url(r'work-weixin-login/$', oauth_work_weixin_login, name='oauth_work_weixin_login'),
    url(r'work-weixin-callback/$', oauth_work_weixin_callback, name='oauth_work_weixin_callback'),
]
