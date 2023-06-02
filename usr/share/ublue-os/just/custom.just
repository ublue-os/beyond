install-beyond-extensions:
  pip install --upgrade gnome-extensions-cli
  gext install replace-activities-label@leleat-on-github
  gext install dock-from-dash@fthx

yafti:
  yafti /etc/yafti.yml
