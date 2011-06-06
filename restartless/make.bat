setlocal
set appname=foxsplitter

copy buildscript\makexpi.sh .\
bash makexpi.sh %appname% version=0
del makexpi.sh
endlocal
