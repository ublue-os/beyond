extensions_venv := "/tmp/.venv-beyond-extensions"

install-beyond-extensions:
  python3 -m venv {{extensions_venv}}
  {{extensions_venv}}/bin/pip install --upgrade gnome-extensions-cli
  {{extensions_venv}}/bin/gext install replace-activities-label@leleat-on-github
  {{extensions_venv}}/bin/gext install panel-corners@aunetx
  rm -r {{extensions_venv}}

yafti:
  yafti /etc/yafti.yml
